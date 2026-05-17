use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;

use crate::{
    backend::backend_dto::SyncEntityDto,
    common::extensions::{
        into_base64::IntoBase64, into_datetime::IntoDateTime, into_timestamp::IntoTimestamp,
    },
    fsrs::{entities::fsrs_profile::FsrsProfile, repositories::fsrs_repository::FsrsRepository},
    generated_code,
    sync::{
        entities::synced_entity::{EntityType, SyncedEntity},
        strategies::sync_entity_strategy::{
            ParseSyncedEntityOutput, SyncEntityStrategy, SyncEntityStrategyError,
        },
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultFsrsProfileStrategy {
    fsrs_repository: Arc<dyn FsrsRepository>,
}

#[async_trait]
impl SyncEntityStrategy for DefaultFsrsProfileStrategy {
    type Input = generated_code::FsrsProfile;
    type Entity = FsrsProfile;

    fn parse(
        &self,
        synced_entity: &SyncedEntity,
        decoded_entity: Self::Input,
    ) -> ParseSyncedEntityOutput<Self::Entity> {
        let entity = FsrsProfile::new_unchecked(
            synced_entity.entity_id,
            synced_entity.created_date,
            decoded_entity
                .modified_date
                .unwrap()
                .into_datetime()
                .unwrap(),
            decoded_entity.name,
            decoded_entity.request_retention,
            decoded_entity.maximum_interval,
            decoded_entity.weights,
        );

        ParseSyncedEntityOutput {
            entity,
            references: vec![],
        }
    }

    async fn upsert(&self, entity: Self::Entity) -> Result<u64, SyncEntityStrategyError> {
        self.fsrs_repository
            .upsert_with_modified_date_if_modified_before(&entity, entity.modified_date())
            .await
            .map_err(Into::into)
    }

    async fn get_sync_dtos_modified_since(
        &self,
        since: DateTime<Utc>,
    ) -> Result<Vec<SyncEntityDto>, SyncEntityStrategyError> {
        let profiles = self
            .fsrs_repository
            .get_all_modified_on_or_after(since)
            .await?;
        Ok(profiles
            .into_iter()
            .map(|p| SyncEntityDto {
                entity_id: p.id(),
                created_date: p.created_date(),
                entity_type: EntityType::FsrsProfile,
                data: generated_code::FsrsProfile {
                    modified_date: Some(p.modified_date().into_timestamp()),
                    name: p.name().to_string(),
                    request_retention: p.request_retention(),
                    maximum_interval: p.maximum_interval(),
                    weights: p.weights().to_vec(),
                }
                .into_base64(),
            })
            .collect())
    }
}
