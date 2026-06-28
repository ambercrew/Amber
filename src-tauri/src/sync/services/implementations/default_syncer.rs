use std::{collections::HashSet, fmt::Debug, sync::Arc};

use async_trait::async_trait;
use base64::{Engine as _, engine::general_purpose};
use chrono::{DateTime, Duration, TimeZone, Utc};
use injector_derive::ScopeInjectable;
use prost::Message;
use uuid::Uuid;

use crate::{
    backend::{backend_dto::SyncEntityDto, clients::brainy_backend_client::BrainyBackendClient},
    fsrs::entities::fsrs_profile::FsrsProfile,
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
    fsrs_profile_strategy:
        Arc<dyn SyncEntityStrategy<Input = generated_code::FsrsProfile, Entity = FsrsProfile>>,
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
                EntityType::FsrsProfile => {
                    self.process_with_strategy(
                        &synced_entity,
                        &bytes,
                        Arc::clone(&self.fsrs_profile_strategy),
                    )
                    .await?
                }
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
            self.fsrs_profile_strategy
                .get_sync_dtos_modified_since(last_sync_date)
                .await?,
        );
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

// TODO:
// #[cfg(test)]
// mod tests {
//     use chrono::Duration;
//     use injector::{injector::Injector, register_scope};
//     use tokio::sync::Mutex;
//
//     use crate::{
//         DEFAULT_FSRS_PROFILE_ID, ROOT_FOLDER_ID,
//         backend::{
//             backend_dto::SyncedEntitiesPageDto,
//             clients::brainy_backend_client::MockBrainyBackendClient,
//         },
//         cells::{
//             entities::{cell::CellType, repetition::State, review::Rating},
//             repositories::{cell_repository::CellRepository, review_repository::ReviewRepository},
//             services::{
//                 cell_invariants_enforcer::CellInvariantsEnforcer,
//                 implementations::default_cell_invariants_enforcer::DefaultCellInvariantsEnforcer,
//             },
//         },
//         common::extensions::{into_base64::IntoBase64, into_timestamp::IntoTimestamp},
//         file_system::{
//             repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
//             value_objects::{
//                 file_system_item_name::FileSystemItemName, fsrs_profile_choice::FsrsProfileChoice,
//             },
//         },
//         fsrs::repositories::fsrs_repository::FsrsRepository,
//         incremental_reading::{
//             extracts::repositories::extract_repository::ExtractRepository,
//             scheduling::repositories::incremental_reading_schedule_repository::IncrementalReadingScheduleRepository,
//         },
//         infrastructure::{
//             extensions::unit_of_work::UnitOfWorkExt,
//             repositories::sqlite::{
//                 sqlite_cell_repository::SqliteCellRepository,
//                 sqlite_extract_repository::SqliteExtractRepository,
//                 sqlite_file_repository::SqliteFileRepository,
//                 sqlite_folder_repository::SqliteFolderRepository,
//                 sqlite_fsrs_repository::SqliteFsrsRepository,
//                 sqlite_incremental_reading_schedule_repository::SqliteIncrementalReadingScheduleRepository,
//                 sqlite_local_configuration_repository::SqliteLocalConfigurationRepository,
//                 sqlite_review_repository::SqliteReviewRepository,
//                 sqlite_sync_repository::SqliteSyncRepository,
//             },
//         },
//         sync::{
//             repositories::sync_repository::SyncRepository,
//             services::syncer::{SyncLock, Syncer},
//             strategies::{
//                 implementations::{
//                     cell_strategy::DefaultCellStrategy,
//                     deleted_entity_strategy::DefaultDeletedEntityStrategy,
//                     extract_strategy::DefaultExtractStrategy, file_strategy::DefaultFileStrategy,
//                     folder_strategy::DefaultFolderStrategy,
//                     fsrs_profile_strategy::DefaultFsrsProfileStrategy,
//                     incremental_reading_schedule_strategy::DefaultIncrementalReadingScheduleStrategy,
//                     repetition_strategy::DefaultRepetitionStrategy,
//                     review_strategy::DefaultReviewStrategy,
//                 },
//                 sync_entity_strategy::SyncEntityStrategy,
//             },
//         },
//         test_utils::create_test_injector,
//     };
//
//     use super::*;
//
//     async fn initialize_test_injector(backend_client: MockBrainyBackendClient) -> Injector {
//         let mut injector = create_test_injector().await;
//         injector.register_singleton::<dyn BrainyBackendClient>(Arc::new(backend_client));
//         injector.register_singleton(Arc::new(SyncLock(Mutex::new(()))));
//         register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
//         register_scope!(injector, dyn FileRepository, SqliteFileRepository);
//         register_scope!(injector, dyn CellRepository, SqliteCellRepository);
//         register_scope!(injector, dyn ReviewRepository, SqliteReviewRepository);
//         register_scope!(injector, dyn ExtractRepository, SqliteExtractRepository);
//         register_scope!(
//             injector,
//             dyn IncrementalReadingScheduleRepository,
//             SqliteIncrementalReadingScheduleRepository
//         );
//         register_scope!(injector, dyn SyncRepository, SqliteSyncRepository);
//         register_scope!(
//             injector,
//             dyn LocalConfigurationRepository,
//             SqliteLocalConfigurationRepository
//         );
//         register_scope!(injector, dyn FsrsRepository, SqliteFsrsRepository);
//         register_scope!(
//             injector,
//             dyn CellInvariantsEnforcer,
//             DefaultCellInvariantsEnforcer
//         );
//         register_scope!(
//             injector,
//             dyn SyncEntityStrategy<Input = generated_code::FsrsProfile, Entity = FsrsProfile>,
//             DefaultFsrsProfileStrategy
//         );
//         register_scope!(
//             injector,
//             dyn SyncEntityStrategy<Input = generated_code::Folder, Entity = Folder>,
//             DefaultFolderStrategy
//         );
//         register_scope!(
//             injector,
//             dyn SyncEntityStrategy<Input = generated_code::File, Entity = File>,
//             DefaultFileStrategy
//         );
//         register_scope!(
//             injector,
//             dyn SyncEntityStrategy<Input = generated_code::Cell, Entity = Cell>,
//             DefaultCellStrategy
//         );
//         register_scope!(
//             injector,
//             dyn SyncEntityStrategy<Input = generated_code::Repetition, Entity = Repetition>,
//             DefaultRepetitionStrategy
//         );
//         register_scope!(
//             injector,
//             dyn SyncEntityStrategy<Input = generated_code::Review, Entity = Review>,
//             DefaultReviewStrategy
//         );
//         register_scope!(
//             injector,
//             dyn SyncEntityStrategy<Input = generated_code::DeletedEntity, Entity = DeletedEntity>,
//             DefaultDeletedEntityStrategy
//         );
//         register_scope!(
//             injector,
//             dyn SyncEntityStrategy<
//                     Input = generated_code::IncrementalReadingSchedule,
//                     Entity = IncrementalReadingSchedule,
//                 >,
//             DefaultIncrementalReadingScheduleStrategy
//         );
//         register_scope!(
//             injector,
//             dyn SyncEntityStrategy<Input = generated_code::Extract, Entity = Extract>,
//             DefaultExtractStrategy
//         );
//         register_scope!(injector, DefaultSyncer);
//         injector
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_new_entities_from_backend_inserted_new_entities() {
//         // Arrange
//
//         let user_id = Uuid::new_v4();
//         let file_id = Uuid::new_v4();
//         let cell_id = Uuid::new_v4();
//         let fsrs_profile_id = Uuid::new_v4();
//         let file_modified_at = Utc::now() - Duration::hours(8);
//
//         let synced_entities: Vec<SyncedEntity> = vec![
//             SyncedEntity {
//                 user_id,
//                 entity_id: fsrs_profile_id,
//                 entity_type: EntityType::FsrsProfile,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: generated_code::FsrsProfile {
//                     modified_at: Some(Utc::now().into_timestamp()),
//                     name: "test profile".into(),
//                     request_retention: 10f64,
//                     maximum_interval: 8f64,
//                     weights: vec![1f64],
//                 }
//                 .into_base64(),
//             },
//             SyncedEntity {
//                 user_id,
//                 entity_id: Uuid::new_v4(),
//                 entity_type: EntityType::Folder,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: generated_code::Folder {
//                     modified_at: Some(Utc::now().into_timestamp()),
//                     name: "test".into(),
//                     parent_id: Some(ROOT_FOLDER_ID.into()),
//                     fsrs_profile_id: None,
//                 }
//                 .into_base64(),
//             },
//             SyncedEntity {
//                 user_id,
//                 entity_id: file_id,
//                 entity_type: EntityType::File,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: generated_code::File {
//                     modified_at: Some(file_modified_at.into_timestamp()),
//                     name: "test".into(),
//                     parent_id: Some(ROOT_FOLDER_ID.into()),
//                     fsrs_profile_id: Some(fsrs_profile_id.to_string()),
//                 }
//                 .into_base64(),
//             },
//             SyncedEntity {
//                 user_id,
//                 entity_id: cell_id,
//                 entity_type: EntityType::Cell,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: generated_code::Cell {
//                     modified_at: Some(Utc::now().into_timestamp()),
//                     content: "content".to_string(),
//                     cell_type: serde_json::to_string(&CellType::FlashCard).unwrap(),
//                     index: 1,
//                     searchable_content: "search".to_string(),
//                     file_id: file_id.to_string(),
//                 }
//                 .into_base64(),
//             },
//             SyncedEntity {
//                 user_id,
//                 entity_id: Uuid::new_v4(),
//                 entity_type: EntityType::Repetition,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: generated_code::Repetition {
//                     modified_at: Some(Utc::now().into_timestamp()),
//                     file_id: file_id.to_string(),
//                     cell_id: cell_id.to_string(),
//                     due: Some(Utc::now().into_timestamp()),
//                     state: serde_json::to_string(&State::Learning).unwrap(),
//                     ..Default::default()
//                 }
//                 .into_base64(),
//             },
//             SyncedEntity {
//                 user_id,
//                 entity_id: Uuid::new_v4(),
//                 entity_type: EntityType::Review,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: generated_code::Review {
//                     modified_at: Some(Utc::now().into_timestamp()),
//                     cell_id: Some(cell_id.to_string()),
//                     date: Some(Utc::now().into_timestamp()),
//                     rating: serde_json::to_string(&Rating::Hard).unwrap(),
//                     ..Default::default()
//                 }
//                 .into_base64(),
//             },
//         ];
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: synced_entities.clone(),
//                     has_more: false,
//                 })
//             });
//
//         backend_client
//             .expect_send_synced_entities()
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         // Act
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Assert
//
//         let fsrs_profiles = scope
//             .resolve::<dyn FsrsRepository>()
//             .await
//             .get_all_fsrs_profiles()
//             .await
//             .unwrap();
//         // Default & new profile.
//         assert_eq!(2, fsrs_profiles.len());
//         assert!(
//             fsrs_profiles
//                 .iter()
//                 .any(|f| f.name() == "test profile" && f.request_retention() == 10f64)
//         );
//
//         let folders = scope
//             .resolve::<dyn FolderRepository>()
//             .await
//             .get_all_folders()
//             .await
//             .unwrap();
//         assert_eq!(2, folders.len());
//         assert!(folders.iter().any(|f| f.name()
//             == FileSystemItemName::new_unchecked("test".to_string())
//             && f.parent_id() == Some(ROOT_FOLDER_ID)
//             && f.fsrs_profile_choice() == FsrsProfileChoice::Inherit));
//
//         let files = scope
//             .resolve::<dyn FileRepository>()
//             .await
//             .get_all_files()
//             .await
//             .unwrap();
//         assert_eq!(1, files.len());
//         assert!(files.iter().any(|f| f.name()
//             == FileSystemItemName::new_unchecked("test".to_string())
//             && f.parent_id() == Some(ROOT_FOLDER_ID)
//             && f.fsrs_profile_choice() == FsrsProfileChoice::Id(fsrs_profile_id)
//             && (f.modified_at() - file_modified_at) <= Duration::seconds(1)));
//
//         let cells = scope
//             .resolve::<dyn CellRepository>()
//             .await
//             .get_file_cells_ordered_by_index(file_id)
//             .await
//             .unwrap();
//         assert_eq!(1, cells.len());
//         assert!(cells.iter().any(|c| c.file_id() == file_id
//             && c.content() == "content"
//             && c.cell_type() == &CellType::FlashCard
//             && c.index() == 1
//             && c.searchable_content() == "search"));
//         assert_eq!(1, cells[0].repetitions().len());
//
//         let home_statistics = scope
//             .resolve::<dyn CellRepository>()
//             .await
//             .get_home_statistics()
//             .await
//             .unwrap();
//         assert_eq!(1, home_statistics.number_of_reviews);
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_two_cells_with_same_index_corrected_index_and_sent_update() {
//         // Arrange
//
//         let cell_in_database_id = Uuid::new_v4();
//         let cell_from_sync_id = Uuid::new_v4();
//
//         let file = File::new_unchecked(
//             Uuid::new_v4(),
//             Utc::now(),
//             Utc::now(),
//             Some(ROOT_FOLDER_ID),
//             "test".try_into().unwrap(),
//             FsrsProfileChoice::Inherit,
//         );
//
//         let synced_entities: Vec<SyncedEntity> = vec![SyncedEntity {
//             user_id: Uuid::new_v4(),
//             entity_id: cell_from_sync_id,
//             entity_type: EntityType::Cell,
//             created_at: Utc::now(),
//             last_sync_date: Utc::now(),
//             data: generated_code::Cell {
//                 modified_at: Some(Utc::now().into_timestamp()),
//                 content: "content".to_string(),
//                 cell_type: serde_json::to_string(&CellType::FlashCard).unwrap(),
//                 index: 1,
//                 searchable_content: "search".to_string(),
//                 file_id: file.id().to_string(),
//             }
//             .into_base64(),
//         }];
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: synced_entities.clone(),
//                     has_more: false,
//                 })
//             });
//
//         // Ensuring that the new index is sent!
//         backend_client
//             .expect_send_synced_entities()
//             .withf(move |value| value.iter().any(|s| s.entity_id == cell_in_database_id))
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         scope
//             .resolve::<dyn FileRepository>()
//             .await
//             .create(&file)
//             .await
//             .unwrap();
//         scope
//             .resolve::<dyn CellRepository>()
//             .await
//             .create(&Cell::new_unchecked(
//                 cell_in_database_id,
//                 Utc::now(),
//                 Utc::now(),
//                 file.id(),
//                 "".to_string(),
//                 CellType::Note,
//                 1,
//                 "".to_string(),
//                 Vec::new(),
//             ))
//             .await
//             .unwrap();
//
//         // Act
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Assert
//
//         let cells = scope
//             .resolve::<dyn CellRepository>()
//             .await
//             .get_file_cells_ordered_by_index(file.id())
//             .await
//             .unwrap();
//         assert!(
//             cells
//                 .iter()
//                 .any(|c| c.id() == cell_from_sync_id && c.index() == 1)
//         );
//         assert!(
//             cells
//                 .iter()
//                 .any(|c| c.id() == cell_in_database_id && c.index() == 2)
//         );
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_deleted_entity_from_backend_processed_correctly() {
//         // Arrange
//
//         let user_id = Uuid::new_v4();
//         let file_id = Uuid::new_v4();
//
//         let synced_entities: Vec<SyncedEntity> = vec![SyncedEntity {
//             user_id,
//             entity_id: file_id,
//             entity_type: EntityType::DeletedEntity,
//             created_at: Utc::now(),
//             last_sync_date: Utc::now(),
//             data: generated_code::DeletedEntity {
//                 entity_name: "files".to_string(),
//                 deleted_date: Some(Utc::now().into_timestamp()),
//             }
//             .into_base64(),
//         }];
//
//         let mut backend_client = MockBrainyBackendClient::new();
//
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: synced_entities.clone(),
//                     has_more: false,
//                 })
//             });
//
//         backend_client
//             .expect_send_synced_entities()
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         scope
//             .resolve::<dyn FileRepository>()
//             .await
//             .create(&File::new_unchecked(
//                 file_id,
//                 Utc::now(),
//                 Utc::now(),
//                 Some(ROOT_FOLDER_ID),
//                 FileSystemItemName::new_unchecked("name".to_string()),
//                 FsrsProfileChoice::Inherit,
//             ))
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Act
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Assert
//
//         let files = scope
//             .resolve::<dyn FileRepository>()
//             .await
//             .get_all_files()
//             .await
//             .unwrap();
//         assert_eq!(0, files.len());
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_existing_entity_with_older_modified_at_local_entity_updated() {
//         // Arrange
//
//         let user_id = Uuid::new_v4();
//         let file_id = Uuid::new_v4();
//         let cell_id = Uuid::new_v4();
//
//         let synced_entities: Vec<SyncedEntity> = vec![
//             SyncedEntity {
//                 user_id,
//                 entity_id: file_id,
//                 entity_type: EntityType::File,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: generated_code::File {
//                     modified_at: Some(Utc::now().into_timestamp()),
//                     name: "new name".into(),
//                     parent_id: Some(ROOT_FOLDER_ID.into()),
//                     fsrs_profile_id: None,
//                 }
//                 .into_base64(),
//             },
//             SyncedEntity {
//                 user_id,
//                 entity_id: cell_id,
//                 entity_type: EntityType::Cell,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: generated_code::Cell {
//                     modified_at: Some(Utc::now().into_timestamp()),
//                     content: "new content".to_string(),
//                     cell_type: serde_json::to_string(&CellType::FlashCard).unwrap(),
//                     file_id: file_id.to_string(),
//                     ..Default::default()
//                 }
//                 .into_base64(),
//             },
//             SyncedEntity {
//                 user_id,
//                 entity_id: DEFAULT_FSRS_PROFILE_ID,
//                 entity_type: EntityType::FsrsProfile,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: generated_code::FsrsProfile {
//                     modified_at: Some(Utc::now().into_timestamp()),
//                     name: "new name".into(),
//                     request_retention: 10f64,
//                     maximum_interval: 8f64,
//                     weights: vec![1f64],
//                 }
//                 .into_base64(),
//             },
//         ];
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: synced_entities.clone(),
//                     has_more: false,
//                 })
//             });
//
//         backend_client
//             .expect_send_synced_entities()
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         scope
//             .resolve::<dyn FileRepository>()
//             .await
//             .create(&File::new_unchecked(
//                 file_id,
//                 Utc::now(),
//                 Utc::now() - Duration::minutes(2),
//                 Some(ROOT_FOLDER_ID),
//                 FileSystemItemName::new_unchecked("old name".to_string()),
//                 FsrsProfileChoice::Inherit,
//             ))
//             .await
//             .unwrap();
//
//         scope
//             .resolve::<dyn CellRepository>()
//             .await
//             .create(&Cell::new_unchecked(
//                 cell_id,
//                 Utc::now(),
//                 Utc::now() - Duration::minutes(2),
//                 file_id,
//                 "old content".to_string(),
//                 CellType::FlashCard,
//                 1,
//                 "".to_string(),
//                 Vec::new(),
//             ))
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Act
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Assert
//
//         let files = scope
//             .resolve::<dyn FileRepository>()
//             .await
//             .get_all_files()
//             .await
//             .unwrap();
//         assert_eq!(1, files.len());
//         assert_eq!(
//             files[0].name(),
//             FileSystemItemName::new_unchecked("new name".to_string())
//         );
//
//         let cells = scope
//             .resolve::<dyn CellRepository>()
//             .await
//             .get_file_cells_ordered_by_index(file_id)
//             .await
//             .unwrap();
//         assert_eq!(1, cells.len());
//         assert!(cells.iter().any(|c| c.content() == "new content"));
//
//         let fsrs_profiles = scope
//             .resolve::<dyn FsrsRepository>()
//             .await
//             .get_all_fsrs_profiles()
//             .await
//             .unwrap();
//         assert_eq!(1, fsrs_profiles.len());
//         assert!(fsrs_profiles.iter().any(|c| c.name() == "new name"));
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_existing_entity_with_newer_modified_at_locally_entities_not_updated()
//      {
//         // Arrange
//
//         let user_id = Uuid::new_v4();
//         let file_id = Uuid::new_v4();
//         let cell_id = Uuid::new_v4();
//
//         let synced_entities_modified_at = Utc::now() - Duration::seconds(1);
//
//         let synced_entities: Vec<SyncedEntity> = vec![
//             SyncedEntity {
//                 user_id,
//                 entity_id: file_id,
//                 entity_type: EntityType::File,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: generated_code::File {
//                     modified_at: Some(synced_entities_modified_at.into_timestamp()),
//                     name: "new name".into(),
//                     parent_id: Some(ROOT_FOLDER_ID.into()),
//                     fsrs_profile_id: None,
//                 }
//                 .into_base64(),
//             },
//             SyncedEntity {
//                 user_id,
//                 entity_id: cell_id,
//                 entity_type: EntityType::Cell,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: generated_code::Cell {
//                     modified_at: Some(synced_entities_modified_at.into_timestamp()),
//                     content: "new content".to_string(),
//                     cell_type: serde_json::to_string(&CellType::FlashCard).unwrap(),
//                     file_id: file_id.to_string(),
//                     ..Default::default()
//                 }
//                 .into_base64(),
//             },
//         ];
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: synced_entities.clone(),
//                     has_more: false,
//                 })
//             });
//
//         backend_client
//             .expect_send_synced_entities()
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         scope
//             .resolve::<dyn FileRepository>()
//             .await
//             .create(&File::new_unchecked(
//                 file_id,
//                 Utc::now(),
//                 Utc::now(),
//                 Some(ROOT_FOLDER_ID),
//                 FileSystemItemName::new_unchecked("old name".to_string()),
//                 FsrsProfileChoice::Inherit,
//             ))
//             .await
//             .unwrap();
//
//         scope
//             .resolve::<dyn CellRepository>()
//             .await
//             .create(&Cell::new_unchecked(
//                 cell_id,
//                 Utc::now(),
//                 Utc::now(),
//                 file_id,
//                 "old content".to_string(),
//                 CellType::FlashCard,
//                 1,
//                 "".to_string(),
//                 Vec::new(),
//             ))
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Act
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Assert
//
//         let files = scope
//             .resolve::<dyn FileRepository>()
//             .await
//             .get_all_files()
//             .await
//             .unwrap();
//         assert_eq!(1, files.len());
//         assert_eq!(
//             files[0].name(),
//             FileSystemItemName::new_unchecked("old name".to_string())
//         );
//
//         let cells = scope
//             .resolve::<dyn CellRepository>()
//             .await
//             .get_file_cells_ordered_by_index(file_id)
//             .await
//             .unwrap();
//         assert_eq!(1, cells.len());
//         assert_eq!(cells[0].content(), "old content");
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_valid_input_updated_sync_date_at_end() {
//         // Arrange
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: Vec::new(),
//                     has_more: false,
//                 })
//             });
//
//         backend_client
//             .expect_send_synced_entities()
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         // Act
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Assert
//
//         let actual_sync_date_configuration = scope
//             .resolve::<dyn LocalConfigurationRepository>()
//             .await
//             .get_by_name(LAST_SYNC_DATE_CONFIGURATION_NAME)
//             .await
//             .unwrap()
//             .unwrap();
//         let actual_date = DateTime::parse_from_rfc3339(&actual_sync_date_configuration.value)
//             .unwrap()
//             .with_timezone(&Utc);
//
//         assert!((Utc::now() - actual_date) <= Duration::seconds(5));
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_local_unsynced_file_sent_file() {
//         // Arrange
//
//         let file = File::new_unchecked(
//             Uuid::new_v4(),
//             Utc::now(),
//             Utc::now(),
//             Some(ROOT_FOLDER_ID),
//             FileSystemItemName::new_unchecked("name".to_string()),
//             FsrsProfileChoice::Inherit,
//         );
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: Vec::new(),
//                     has_more: false,
//                 })
//             });
//
//         backend_client
//             .expect_send_synced_entities()
//             // The count should be 2 due to the root folder and default FSRS profile.
//             .withf(move |value| value.len() == 3)
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         scope
//             .resolve::<dyn FileRepository>()
//             .await
//             .create(&file)
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Act & Assert
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_local_file_already_synced_did_not_send_file() {
//         // Arrange
//
//         let file = File::new_unchecked(
//             Uuid::new_v4(),
//             Utc::now(),
//             Utc::now() - Duration::seconds(10),
//             Some(ROOT_FOLDER_ID),
//             FileSystemItemName::new_unchecked("name".to_string()),
//             FsrsProfileChoice::Inherit,
//         );
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: Vec::new(),
//                     has_more: false,
//                 })
//             });
//
//         backend_client
//             .expect_send_synced_entities()
//             // The count should be 2 due to the root folder and default FSRS profile.
//             .withf(move |value| value.len() == 2)
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         scope
//             .resolve::<dyn LocalConfigurationRepository>()
//             .await
//             .upsert(&LocalConfiguration {
//                 name: LAST_SYNC_DATE_CONFIGURATION_NAME.to_string(),
//                 value: Utc::now().to_rfc3339(),
//             })
//             .await
//             .unwrap();
//
//         scope
//             .resolve::<dyn FileRepository>()
//             .await
//             .create(&file)
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Act & Assert
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_last_sync_date_stale_used_initial_date() {
//         // Arrange
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .withf(|date, _| {
//                 (*date - Utc.with_ymd_and_hms(2001, 1, 1, 0, 0, 0).unwrap()).abs()
//                     <= Duration::seconds(1)
//             })
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: Vec::new(),
//                     has_more: false,
//                 })
//             });
//
//         backend_client
//             .expect_send_synced_entities()
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         scope
//             .resolve::<dyn LocalConfigurationRepository>()
//             .await
//             .upsert(&LocalConfiguration {
//                 name: LAST_SYNC_DATE_CONFIGURATION_NAME.to_string(),
//                 value: (Utc::now() - Duration::days(200)).to_rfc3339(),
//             })
//             .await
//             .unwrap();
//
//         // Act & Assert
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_last_sync_date_recent_used_stored_date() {
//         // Arrange
//
//         let stored_sync_date = Utc::now() - Duration::days(30);
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .withf(move |date, _| (*date - stored_sync_date).abs() <= Duration::seconds(1))
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: Vec::new(),
//                     has_more: false,
//                 })
//             });
//
//         backend_client
//             .expect_send_synced_entities()
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         scope
//             .resolve::<dyn LocalConfigurationRepository>()
//             .await
//             .upsert(&LocalConfiguration {
//                 name: LAST_SYNC_DATE_CONFIGURATION_NAME.to_string(),
//                 value: stored_sync_date.to_rfc3339(),
//             })
//             .await
//             .unwrap();
//
//         // Act & Assert
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_missing_required_reference_and_entity_not_already_deleted_marked_as_deleted()
//      {
//         // Arrange
//
//         let file_id = Uuid::new_v4();
//         let cell_id = Uuid::new_v4();
//
//         let synced_entities: Vec<SyncedEntity> = vec![SyncedEntity {
//             user_id: Uuid::new_v4(),
//             entity_id: cell_id,
//             entity_type: EntityType::Cell,
//             created_at: Utc::now(),
//             last_sync_date: Utc::now(),
//             data: generated_code::Cell {
//                 modified_at: Some(Utc::now().into_timestamp()),
//                 content: "content".to_string(),
//                 cell_type: serde_json::to_string(&CellType::FlashCard).unwrap(),
//                 index: 1,
//                 searchable_content: "search".to_string(),
//                 file_id: file_id.to_string(),
//             }
//             .into_base64(),
//         }];
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: synced_entities.clone(),
//                     has_more: false,
//                 })
//             });
//         backend_client
//             .expect_send_synced_entities()
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         // Seed deleted_entities with the file so the cell's required reference is invalid.
//         scope
//             .resolve::<dyn SyncRepository>()
//             .await
//             .delete_synced_entity(&SyncedEntity {
//                 user_id: Uuid::new_v4(),
//                 entity_id: file_id,
//                 entity_type: EntityType::File,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: String::new(),
//             })
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Act
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Assert
//
//         let cells = scope
//             .resolve::<dyn CellRepository>()
//             .await
//             .get_file_cells_ordered_by_index(file_id)
//             .await
//             .unwrap();
//         assert_eq!(0, cells.len());
//
//         let is_cell_deleted = scope
//             .resolve::<dyn SyncRepository>()
//             .await
//             .is_entity_deleted(cell_id)
//             .await
//             .unwrap();
//         assert!(is_cell_deleted);
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_missing_required_reference_and_entity_already_deleted_updated_deleted_date()
//      {
//         // Arrange
//
//         let file_id = Uuid::new_v4();
//         let cell_id = Uuid::new_v4();
//
//         let synced_entities: Vec<SyncedEntity> = vec![SyncedEntity {
//             user_id: Uuid::new_v4(),
//             entity_id: cell_id,
//             entity_type: EntityType::Cell,
//             created_at: Utc::now(),
//             last_sync_date: Utc::now(),
//             data: generated_code::Cell {
//                 modified_at: Some(Utc::now().into_timestamp()),
//                 content: "content".to_string(),
//                 cell_type: serde_json::to_string(&CellType::FlashCard).unwrap(),
//                 index: 1,
//                 searchable_content: "search".to_string(),
//                 file_id: file_id.to_string(),
//             }
//             .into_base64(),
//         }];
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: synced_entities.clone(),
//                     has_more: false,
//                 })
//             });
//         backend_client
//             .expect_send_synced_entities()
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         // Seed deleted_entities with both the file and the cell.
//         let sync_repository = scope.resolve::<dyn SyncRepository>().await;
//         sync_repository
//             .delete_synced_entity(&SyncedEntity {
//                 user_id: Uuid::new_v4(),
//                 entity_id: file_id,
//                 entity_type: EntityType::File,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: String::new(),
//             })
//             .await
//             .unwrap();
//         sync_repository
//             .delete_synced_entity(&SyncedEntity {
//                 user_id: Uuid::new_v4(),
//                 entity_id: cell_id,
//                 entity_type: EntityType::Cell,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: String::new(),
//             })
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Act
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Assert
//
//         let deleted_entities = scope
//             .resolve::<dyn SyncRepository>()
//             .await
//             .get_all_deleted_entities_on_or_after(
//                 Utc.with_ymd_and_hms(2001, 1, 1, 0, 0, 0).unwrap(),
//             )
//             .await
//             .unwrap();
//         let cell_rows = deleted_entities
//             .iter()
//             .filter(|d| d.entity_id == cell_id)
//             .count();
//         // The cell was already in deleted_entities, so the existing row should
//         // be updated rather than a new duplicate being inserted.
//         assert_eq!(1, cell_rows);
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_optional_reference_deleted_repair_applied_and_entity_upserted() {
//         // Arrange
//
//         let file_id = Uuid::new_v4();
//         let deleted_fsrs_id = Uuid::new_v4();
//
//         let synced_entities: Vec<SyncedEntity> = vec![SyncedEntity {
//             user_id: Uuid::new_v4(),
//             entity_id: file_id,
//             entity_type: EntityType::File,
//             created_at: Utc::now(),
//             last_sync_date: Utc::now(),
//             data: generated_code::File {
//                 modified_at: Some(Utc::now().into_timestamp()),
//                 name: "test".into(),
//                 parent_id: Some(ROOT_FOLDER_ID.into()),
//                 fsrs_profile_id: Some(deleted_fsrs_id.to_string()),
//             }
//             .into_base64(),
//         }];
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: synced_entities.clone(),
//                     has_more: false,
//                 })
//             });
//         backend_client
//             .expect_send_synced_entities()
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         // Seed deleted_entities with the referenced FSRS profile so the optional
//         // reference triggers the repair function.
//         scope
//             .resolve::<dyn SyncRepository>()
//             .await
//             .delete_synced_entity(&SyncedEntity {
//                 user_id: Uuid::new_v4(),
//                 entity_id: deleted_fsrs_id,
//                 entity_type: EntityType::FsrsProfile,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: String::new(),
//             })
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Act
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Assert
//
//         let files = scope
//             .resolve::<dyn FileRepository>()
//             .await
//             .get_all_files()
//             .await
//             .unwrap();
//         assert_eq!(1, files.len());
//         assert_eq!(file_id, files[0].id());
//         assert_eq!(FsrsProfileChoice::Inherit, files[0].fsrs_profile_choice());
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_locally_deleted_entity_received_from_backend_entity_skipped() {
//         // Arrange
//
//         let file_id = Uuid::new_v4();
//
//         let synced_entities: Vec<SyncedEntity> = vec![SyncedEntity {
//             user_id: Uuid::new_v4(),
//             entity_id: file_id,
//             entity_type: EntityType::File,
//             created_at: Utc::now(),
//             last_sync_date: Utc::now(),
//             data: generated_code::File {
//                 modified_at: Some(Utc::now().into_timestamp()),
//                 name: "should not be inserted".into(),
//                 parent_id: Some(ROOT_FOLDER_ID.into()),
//                 fsrs_profile_id: None,
//             }
//             .into_base64(),
//         }];
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: synced_entities.clone(),
//                     has_more: false,
//                 })
//             });
//         backend_client
//             .expect_send_synced_entities()
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         // Mark the file as deleted locally before sync so the deletes-win strategy applies.
//         scope
//             .resolve::<dyn SyncRepository>()
//             .await
//             .delete_synced_entity(&SyncedEntity {
//                 user_id: Uuid::new_v4(),
//                 entity_id: file_id,
//                 entity_type: EntityType::File,
//                 created_at: Utc::now(),
//                 last_sync_date: Utc::now(),
//                 data: String::new(),
//             })
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Act
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//
//         // Assert
//
//         let files = scope
//             .resolve::<dyn FileRepository>()
//             .await
//             .get_all_files()
//             .await
//             .unwrap();
//         assert_eq!(0, files.len());
//     }
//
//     #[tokio::test]
//     pub async fn sync_with_backend_overwritten_change_from_backend_did_not_send_change() {
//         // Arrange
//
//         let folder_id = Uuid::new_v4();
//
//         let synced_entities: Vec<SyncedEntity> = vec![SyncedEntity {
//             user_id: Uuid::new_v4(),
//             entity_id: folder_id,
//             entity_type: EntityType::Folder,
//             created_at: Utc::now(),
//             last_sync_date: Utc::now(),
//             data: generated_code::Folder {
//                 modified_at: Some(Utc::now().into_timestamp()),
//                 name: "test".into(),
//                 parent_id: Some(ROOT_FOLDER_ID.into()),
//                 fsrs_profile_id: None,
//             }
//             .into_base64(),
//         }];
//
//         let mut backend_client = MockBrainyBackendClient::new();
//         backend_client
//             .expect_get_synced_entities_after_ordered_by_created_at()
//             .returning(move |_, _| {
//                 Ok(SyncedEntitiesPageDto {
//                     synced_entities: synced_entities.clone(),
//                     has_more: false,
//                 })
//             });
//
//         backend_client
//             .expect_send_synced_entities()
//             // The count should be 2 due to the root folder, and FSRS profile, the created folder should not be sent.
//             .withf(move |value| value.len() == 2)
//             .returning(move |_| Ok(()));
//
//         let injector = initialize_test_injector(backend_client).await;
//         let scope = injector.start_scope();
//
//         scope
//             .resolve::<dyn FolderRepository>()
//             .await
//             .create(&Folder::new_unchecked(
//                 folder_id,
//                 Utc::now() - Duration::minutes(1),
//                 Utc::now() - Duration::minutes(1),
//                 None,
//                 FileSystemItemName::new_unchecked("test".to_string()),
//                 FsrsProfileChoice::Inherit,
//             ))
//             .await
//             .unwrap();
//
//         // Act & Assert
//
//         scope
//             .resolve::<DefaultSyncer>()
//             .await
//             .sync_with_backend()
//             .await
//             .unwrap();
//         scope.save_changes().await.unwrap();
//     }
// }
