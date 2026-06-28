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
        entities::{
            deleted_entity::DeletedEntity,
            synced_entity::{EntityType, SyncedEntity},
        },
        repositories::sync_repository::SyncRepository,
        strategies::sync_entity_strategy::{
            ParseSyncedEntityOutput, SyncEntityStrategy, SyncEntityStrategyError,
        },
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultDeletedEntityStrategy {
    sync_repository: Arc<dyn SyncRepository>,
}

#[async_trait]
impl SyncEntityStrategy for DefaultDeletedEntityStrategy {
    type Input = generated_code::DeletedEntity;
    type Entity = DeletedEntity;

    fn parse(
        &self,
        synced_entity: &SyncedEntity,
        decoded_entity: Self::Input,
    ) -> ParseSyncedEntityOutput<Self::Entity> {
        let entity = DeletedEntity::new(
            synced_entity.entity_id,
            decoded_entity.entity_name,
            synced_entity.created_at,
            decoded_entity
                .deleted_date
                .unwrap()
                .into_datetime()
                .unwrap(),
        );

        ParseSyncedEntityOutput {
            entity,
            references: vec![],
        }
    }

    async fn upsert(&self, entity: Self::Entity) -> Result<u64, SyncEntityStrategyError> {
        self.sync_repository
            .apply_deleted_entity(entity)
            .await
            .map_err(Into::into)
    }

    async fn get_sync_dtos_modified_since(
        &self,
        since: DateTime<Utc>,
    ) -> Result<Vec<SyncEntityDto>, SyncEntityStrategyError> {
        let deleted_entities = self
            .sync_repository
            .get_all_deleted_entities_on_or_after(since)
            .await?;
        Ok(deleted_entities
            .into_iter()
            .map(|d| SyncEntityDto {
                entity_id: d.entity_id,
                created_at: d.entity_created_at,
                entity_type: EntityType::DeletedEntity,
                data: generated_code::DeletedEntity {
                    entity_name: d.entity_name,
                    deleted_date: Some(d.deleted_date.into_timestamp()),
                }
                .into_base64(),
            })
            .collect())
    }
}
