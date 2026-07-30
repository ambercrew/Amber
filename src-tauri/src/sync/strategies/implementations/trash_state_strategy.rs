use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;

use crate::{
    backend::backend_dto::SyncEntityDto,
    common::extensions::{
        into_base64::IntoBase64, into_datetime::IntoDateTime, into_timestamp::IntoTimestamp,
    },
    generated_code,
    sync::{
        entities::synced_entity::{EntityType, SyncedEntity},
        strategies::sync_entity_strategy::{
            ParseSyncedEntityOutput, SyncEntityStrategy, SyncEntityStrategyError,
        },
    },
    trash::{entities::trash_state::TrashState, repositories::trash_repository::TrashRepository},
};

#[derive(ScopeInjectable)]
pub struct DefaultTrashStateStrategy {
    trash_repository: Arc<dyn TrashRepository>,
}

#[async_trait]
impl SyncEntityStrategy for DefaultTrashStateStrategy {
    type Input = generated_code::TrashState;
    type Entity = TrashState;

    fn parse(
        &self,
        synced_entity: &SyncedEntity,
        decoded_entity: Self::Input,
    ) -> ParseSyncedEntityOutput<Self::Entity> {
        let entity = TrashState {
            element_id: synced_entity.entity_id,
            element_created_at: synced_entity.created_at,
            trashed_at: decoded_entity
                .trashed_at
                .and_then(IntoDateTime::into_datetime),
            trashed_root: decoded_entity.trashed_root,
            trash_modified_at: decoded_entity
                .trash_modified_at
                .and_then(IntoDateTime::into_datetime)
                .unwrap_or(synced_entity.last_sync_date),
        };

        // The element itself is not a foreign key of the trash state: an update
        // for an element this machine does not have simply affects no rows.
        ParseSyncedEntityOutput {
            entity,
            references: vec![],
        }
    }

    async fn upsert(&self, entity: Self::Entity) -> Result<u64, SyncEntityStrategyError> {
        self.trash_repository
            .apply_state(entity)
            .await
            .map_err(Into::into)
    }

    async fn get_sync_dtos_modified_since(
        &self,
        since: DateTime<Utc>,
    ) -> Result<Vec<SyncEntityDto>, SyncEntityStrategyError> {
        let states = self
            .trash_repository
            .get_states_modified_since(since)
            .await?;
        Ok(states
            .into_iter()
            .map(|state| SyncEntityDto {
                entity_id: state.element_id,
                created_at: state.element_created_at,
                entity_type: EntityType::TrashState,
                data: generated_code::TrashState {
                    trashed_at: state.trashed_at.map(IntoTimestamp::into_timestamp),
                    trashed_root: state.trashed_root,
                    trash_modified_at: Some(state.trash_modified_at.into_timestamp()),
                }
                .into_base64(),
            })
            .collect())
    }
}
