use std::{collections::HashSet, fmt::Debug, sync::Arc};

use async_trait::async_trait;
use base64::{Engine as _, engine::general_purpose};
use chrono::{DateTime, Duration, TimeZone, Utc};
use injector_derive::ScopeInjectable;
use prost::Message;
use uuid::Uuid;

use crate::{
    backend::{backend_dto::SyncEntityDto, clients::brainy_backend_client::BrainyBackendClient},
    generated_code::{self},
    local_configurations::{
        entities::local_configuration::LocalConfiguration,
        repositories::local_configuration_repository::LocalConfigurationRepository,
    },
    sync::{
        entities::{
            deleted_entity::DeletedEntity,
            synced_entity::{EntityType, SyncedEntity},
        },
        repositories::sync_repository::SyncRepository,
        services::syncer::{SyncError, SyncLock, Syncer},
        strategies::sync_entity_strategy::{ParseSyncedEntityReference, SyncEntityStrategy},
    },
};

const LAST_SYNC_DATE_CONFIGURATION_NAME: &str = "LAST_SYNC_DATE";
const STALE_SYNC_THRESHOLD_DAYS: i64 = 183;

#[derive(ScopeInjectable)]
pub struct DefaultSyncer {
    backend_client: Arc<dyn BrainyBackendClient>,
    sync_repository: Arc<dyn SyncRepository>,
    local_configuration_repository: Arc<dyn LocalConfigurationRepository>,
    sync_lock: Arc<SyncLock>,
    deleted_entity_strategy:
        Arc<dyn SyncEntityStrategy<Input = generated_code::DeletedEntity, Entity = DeletedEntity>>,
}

#[async_trait]
impl Syncer for DefaultSyncer {
    /// Gets the entities from the backend since last sync and uploads all changed
    /// entities that were not overwritten by the server during the pull phase.
    async fn sync_with_backend(&self) -> Result<(), SyncError> {
        // Only allowing one sync at a time.
        let _guard = self.sync_lock.0.lock().await;

        let last_sync_date = self
            .local_configuration_repository
            .get_by_name(LAST_SYNC_DATE_CONFIGURATION_NAME)
            .await?
            .and_then(|conf| match DateTime::parse_from_rfc3339(&conf.value) {
                Ok(date) => Some(date.with_timezone(&Utc)),
                Err(error) => {
                    log::warn!(
                        "Failed to parse stored {LAST_SYNC_DATE_CONFIGURATION_NAME} value {:?}: {error}. Falling back to initial date.",
                        conf.value
                    );
                    None
                }
            })
            // Discard stale sync dates so we re-pull data purged from the local DB.
            .filter(|date| Utc::now() - *date <= Duration::days(STALE_SYNC_THRESHOLD_DAYS))
            .unwrap_or(Utc.with_ymd_and_hms(2001, 1, 1, 0, 0, 0).unwrap());

        let mut sync_page = 0;
        // Tracks entities whose local state was overwritten by the server during the
        // pull phase. These are excluded from the subsequent push so we don't
        // immediately re-upload stale local data on top of what was just received.
        let mut entities_overwritten_by_server = HashSet::new();

        loop {
            let has_more = self
                .fetch_and_process_next_sync_page(
                    sync_page,
                    last_sync_date,
                    &mut entities_overwritten_by_server,
                )
                .await?;
            if has_more {
                sync_page += 1;
            } else {
                break;
            }
        }

        self.send_unsynced_entities_since(last_sync_date, &entities_overwritten_by_server)
            .await?;

        self.local_configuration_repository
            .upsert(&LocalConfiguration {
                name: LAST_SYNC_DATE_CONFIGURATION_NAME.to_string(),
                // NOTE: this has to be set now, otherwise the entities sent from this machine will
                // be refetched on next fetch.
                value: Utc::now().to_rfc3339(),
            })
            .await?;

        log::info!("Sync is completed.");

        Ok(())
    }
}

impl DefaultSyncer {
    /// Fetches and processes the next sync page.
    ///
    /// Returns `true` if there are more pages to process, `false` once the last
    /// page has been handled.
    ///
    /// When the repository upsert for a received entity writes new data (i.e. the
    /// server version was newer than the local one), the entity ID is added to
    /// `entities_overwritten_by_server` so the push phase can skip it and avoid
    /// re-uploading the just-received data.
    async fn fetch_and_process_next_sync_page(
        &self,
        sync_page: u32,
        last_sync_date: DateTime<Utc>,
        entities_overwritten_by_server: &mut HashSet<Uuid>,
    ) -> Result<bool, SyncError> {
        let result = self
            .backend_client
            .get_synced_entities_after_ordered_by_created_at(last_sync_date, sync_page)
            .await?;

        for synced_entity in result.synced_entities {
            let entity_id = synced_entity.entity_id;

            // If entity is deleted locally favor "deletes-win" strategy!
            if self
                .sync_repository
                .is_entity_deleted(synced_entity.entity_id)
                .await?
            {
                continue;
            }

            log::info!(
                "Processing synced entity with id {} and of type {:?}",
                synced_entity.entity_id,
                synced_entity.entity_type
            );

            let bytes = general_purpose::STANDARD.decode(&synced_entity.data)?;

            // The strategies returns the number of rows affected by the
            // upsert. A non-zero value means the server version was newer than what
            // we had locally, so the local state was actually overwritten. A zero
            // return means the local version was already equal or newer and the
            // upsert was a no-op.
            let rows_affected = match synced_entity.entity_type {
                EntityType::DeletedEntity => {
                    self.process_with_strategy(
                        &synced_entity,
                        &bytes,
                        Arc::clone(&self.deleted_entity_strategy),
                    )
                    .await?
                }
            };

            if rows_affected > 0 {
                entities_overwritten_by_server.insert(entity_id);
            }
        }

        Ok(result.has_more)
    }

    async fn process_with_strategy<I, E>(
        &self,
        synced_entity: &SyncedEntity,
        bytes: &[u8],
        strategy: Arc<dyn SyncEntityStrategy<Input = I, Entity = E>>,
    ) -> Result<u64, SyncError>
    where
        I: Message + Default,
        E: Send + Debug,
    {
        let decoded = I::decode(bytes)?;
        let parsed = strategy.parse(synced_entity, decoded);
        let mut entity = parsed.entity;

        #[cfg(debug_assertions)]
        log::info!("Parsed entity {:#?}", entity);

        if !self
            .handle_parsed_entity_references(&mut entity, parsed.references)
            .await?
        {
            self.handle_invalid_references(synced_entity).await?;
            return Ok(0);
        }
        strategy.upsert(entity).await.map_err(Into::into)
    }

    /// Handles the entities that does not have valid foreign key references locally.
    async fn handle_invalid_references(
        &self,
        synced_entity: &SyncedEntity,
    ) -> Result<(), SyncError> {
        if !self
            .sync_repository
            .is_entity_deleted(synced_entity.entity_id)
            .await?
        {
            log::warn!(
                "The synced entity has a reference that is no longer existing in the database, deleting the synced entity!"
            );
            // This is the last resort when there is no way to fix the reference, to just
            // delete it since one of its referenced entities are deleted locally!
            self.sync_repository
                .delete_synced_entity(synced_entity)
                .await?;
        }
        Ok(())
    }

    /// Checks whether an entity's foreign-key references exist in the local database.
    ///
    /// For each reference:
    ///
    /// - If the referenced entity is missing and there is no `repair` function, returns
    ///   `false` immediately — the entity cannot be kept without that dependency.
    /// - If the referenced entity is missing but a `repair` function is provided, calls
    ///   it to patch the entity in place (e.g. set a nullable field to `None`) and
    ///   continues checking the remaining references.
    ///
    /// Returns `true` when all references are satisfied or repaired, `false` otherwise.
    async fn handle_parsed_entity_references<T>(
        &self,
        entity: &mut T,
        references: Vec<ParseSyncedEntityReference<T>>,
    ) -> Result<bool, SyncError> {
        for reference in references {
            if !self.sync_repository.is_entity_deleted(reference.id).await? {
                continue;
            }

            if reference.repair.is_none() {
                return Ok(false);
            }

            let repair = reference.repair.unwrap();
            repair(entity);
        }

        Ok(true)
    }

    /// Sends all entities with modified date on or after `last_sync_date` to the
    /// backend, skipping any whose IDs are present in `excluded_entities`.
    async fn send_unsynced_entities_since(
        &self,
        last_sync_date: DateTime<Utc>,
        excluded_entities: &HashSet<Uuid>,
    ) -> Result<(), SyncError> {
        log::info!("Sending all entities modified after date {last_sync_date} to sync.");

        let mut synced_entities = Vec::<SyncEntityDto>::new();
        synced_entities.extend(
            self.deleted_entity_strategy
                .get_sync_dtos_modified_since(last_sync_date)
                .await?,
        );
        synced_entities.retain(|entity| !excluded_entities.contains(&entity.entity_id));

        log::info!("Sending to backend {} entities", synced_entities.len());

        if synced_entities.is_empty() {
            return Ok(());
        }

        for batch in synced_entities.chunks(80) {
            self.backend_client.send_synced_entities(batch).await?;
        }

        Ok(())
    }
}
