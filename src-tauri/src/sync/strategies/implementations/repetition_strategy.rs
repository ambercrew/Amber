use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    backend::backend_dto::SyncEntityDto,
    cells::{entities::repetition::Repetition, repositories::cell_repository::CellRepository},
    common::extensions::{
        into_base64::IntoBase64, into_datetime::IntoDateTime, into_timestamp::IntoTimestamp,
    },
    generated_code,
    sync::{
        entities::synced_entity::{EntityType, SyncedEntity},
        strategies::sync_entity_strategy::{
            ParseSyncedEntityOutput, ParseSyncedEntityReference, SyncEntityStrategy,
            SyncEntityStrategyError,
        },
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultRepetitionStrategy {
    cell_repository: Arc<dyn CellRepository>,
}

#[async_trait]
impl SyncEntityStrategy for DefaultRepetitionStrategy {
    type Input = generated_code::Repetition;
    type Entity = Repetition;

    fn parse(
        &self,
        synced_entity: &SyncedEntity,
        decoded_entity: Self::Input,
    ) -> ParseSyncedEntityOutput<Self::Entity> {
        let entity = Repetition::new_unchecked(
            synced_entity.entity_id,
            synced_entity.created_date,
            decoded_entity
                .modified_date
                .unwrap()
                .into_datetime()
                .unwrap(),
            Guid::parse_str(&decoded_entity.file_id).unwrap(),
            Guid::parse_str(&decoded_entity.cell_id).unwrap(),
            decoded_entity.due.unwrap().into_datetime().unwrap(),
            decoded_entity.stability,
            decoded_entity.difficulty,
            decoded_entity.learning_steps,
            decoded_entity.scheduled_days,
            decoded_entity.reps,
            decoded_entity.lapses,
            serde_json::from_str(&decoded_entity.state).unwrap(),
            decoded_entity
                .last_review
                .and_then(|value| value.into_datetime()),
            decoded_entity.additional_content,
        );

        let file_id = entity.file_id();
        let cell_id = entity.cell_id();
        ParseSyncedEntityOutput {
            entity,
            references: vec![
                ParseSyncedEntityReference {
                    id: file_id,
                    repair: None,
                },
                ParseSyncedEntityReference {
                    id: cell_id,
                    repair: None,
                },
            ],
        }
    }

    async fn upsert(&self, entity: Self::Entity) -> Result<u64, SyncEntityStrategyError> {
        self.cell_repository
            .upsert_repetition_with_modified_date_if_modified_before(
                &entity,
                entity.modified_date(),
            )
            .await
            .map_err(Into::into)
    }

    async fn get_sync_dtos_modified_since(
        &self,
        since: DateTime<Utc>,
    ) -> Result<Vec<SyncEntityDto>, SyncEntityStrategyError> {
        let repetitions = self
            .cell_repository
            .get_all_repetitions_modified_on_or_after(since)
            .await?;
        Ok(repetitions
            .into_iter()
            .map(|r| SyncEntityDto {
                entity_id: r.id(),
                created_date: r.created_date(),
                entity_type: EntityType::Repetition,
                data: generated_code::Repetition {
                    modified_date: Some(r.modified_date().into_timestamp()),
                    file_id: r.file_id().to_string(),
                    cell_id: r.cell_id().to_string(),
                    due: Some(r.due().into_timestamp()),
                    reps: r.reps(),
                    stability: r.stability(),
                    difficulty: r.difficulty(),
                    learning_steps: r.learning_steps(),
                    scheduled_days: r.scheduled_days(),
                    lapses: r.lapses(),
                    state: serde_json::to_string(&r.state()).unwrap(),
                    last_review: r.last_review().map(|value| value.into_timestamp()),
                    additional_content: r.additional_content().map(|value| value.to_string()),
                }
                .into_base64(),
            })
            .collect())
    }
}
