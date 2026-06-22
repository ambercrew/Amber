use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    backend::backend_dto::SyncEntityDto,
    common::extensions::{
        into_base64::IntoBase64, into_datetime::IntoDateTime, into_timestamp::IntoTimestamp,
    },
    generated_code,
    incremental_reading::scheduling::{
        entities::incremental_reading_schedule::IncrementalReadingSchedule,
        repositories::incremental_reading_schedule_repository::IncrementalReadingScheduleRepository,
    },
    sync::{
        entities::synced_entity::{EntityType, SyncedEntity},
        strategies::sync_entity_strategy::{
            ParseSyncedEntityOutput, ParseSyncedEntityReference, SyncEntityStrategy,
            SyncEntityStrategyError,
        },
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultIncrementalReadingScheduleStrategy {
    incremental_reading_schedule_repository: Arc<dyn IncrementalReadingScheduleRepository>,
}

#[async_trait]
impl SyncEntityStrategy for DefaultIncrementalReadingScheduleStrategy {
    type Input = generated_code::IncrementalReadingSchedule;
    type Entity = IncrementalReadingSchedule;

    fn parse(
        &self,
        synced_entity: &SyncedEntity,
        decoded_entity: Self::Input,
    ) -> ParseSyncedEntityOutput<Self::Entity> {
        let entity = IncrementalReadingSchedule::new_unchecked(
            synced_entity.entity_id,
            synced_entity.created_date,
            decoded_entity
                .modified_date
                .unwrap()
                .into_datetime()
                .unwrap(),
            Guid::parse_str(&decoded_entity.cell_id).unwrap(),
            serde_json::from_str(&decoded_entity.priority).unwrap(),
            decoded_entity.title,
            decoded_entity
                .next_reading_date
                .unwrap()
                .into_datetime()
                .unwrap(),
            decoded_entity.completed,
            decoded_entity.has_extracts,
        );

        let cell_id = entity.cell_id();
        ParseSyncedEntityOutput {
            entity,
            references: vec![ParseSyncedEntityReference {
                id: cell_id,
                repair: None,
            }],
        }
    }

    async fn upsert(&self, entity: Self::Entity) -> Result<u64, SyncEntityStrategyError> {
        self.incremental_reading_schedule_repository
            .upsert_with_modified_date_if_modified_before(&entity, entity.modified_date())
            .await
            .map_err(Into::into)
    }

    async fn get_sync_dtos_modified_since(
        &self,
        since: DateTime<Utc>,
    ) -> Result<Vec<SyncEntityDto>, SyncEntityStrategyError> {
        let schedules = self
            .incremental_reading_schedule_repository
            .get_all_modified_on_or_after(since)
            .await?;
        Ok(schedules
            .into_iter()
            .map(|s| SyncEntityDto {
                entity_id: s.id(),
                created_date: s.created_date(),
                entity_type: EntityType::IncrementalReadingSchedule,
                data: generated_code::IncrementalReadingSchedule {
                    modified_date: Some(s.modified_date().into_timestamp()),
                    cell_id: s.cell_id().to_string(),
                    priority: serde_json::to_string(s.priority()).unwrap(),
                    title: s.title().to_string(),
                    next_reading_date: Some(s.next_reading_date().into_timestamp()),
                    completed: s.completed(),
                    has_extracts: s.has_extracts(),
                }
                .into_base64(),
            })
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use injector::register_scope;

    use super::*;

    use crate::{
        Guid,
        cells::value_objects::incremental_reading::IncrementalReadingPriority,
        common::extensions::into_timestamp::IntoTimestamp,
        generated_code,
        incremental_reading::scheduling::repositories::incremental_reading_schedule_repository::IncrementalReadingScheduleRepository,
        infrastructure::repositories::sqlite::sqlite_incremental_reading_schedule_repository::SqliteIncrementalReadingScheduleRepository,
        sync::{
            entities::synced_entity::{EntityType, SyncedEntity},
            strategies::sync_entity_strategy::SyncEntityStrategy,
        },
        test_utils::create_test_injector,
    };

    async fn make_strategy() -> Arc<
        dyn SyncEntityStrategy<
                Input = generated_code::IncrementalReadingSchedule,
                Entity = IncrementalReadingSchedule,
            >,
    > {
        let mut injector = create_test_injector().await;
        register_scope!(
            injector,
            dyn IncrementalReadingScheduleRepository,
            SqliteIncrementalReadingScheduleRepository
        );
        register_scope!(
            injector,
            dyn SyncEntityStrategy<
                    Input = generated_code::IncrementalReadingSchedule,
                    Entity = IncrementalReadingSchedule,
                >,
            DefaultIncrementalReadingScheduleStrategy
        );
        injector
            .start_scope()
            .resolve::<dyn SyncEntityStrategy<
                    Input = generated_code::IncrementalReadingSchedule,
                    Entity = IncrementalReadingSchedule,
                >>()
            .await
    }

    fn make_synced_entity() -> SyncedEntity {
        SyncedEntity {
            user_id: Guid::new_v4(),
            entity_id: Guid::new_v4(),
            created_date: Utc::now(),
            last_sync_date: Utc::now(),
            entity_type: EntityType::IncrementalReadingSchedule,
            data: String::new(),
        }
    }

    #[tokio::test]
    async fn parse_with_cell_id_reference_is_required_without_repair_fn() {
        // Arrange

        let strategy = make_strategy().await;
        let synced_entity = make_synced_entity();
        let cell_id = Guid::new_v4();
        let decoded = generated_code::IncrementalReadingSchedule {
            modified_date: Some(Utc::now().into_timestamp()),
            cell_id: cell_id.to_string(),
            priority: serde_json::to_string(&IncrementalReadingPriority::Normal).unwrap(),
            title: "title".to_string(),
            next_reading_date: Some(Utc::now().into_timestamp()),
            completed: false,
            has_extracts: false,
        };

        // Act

        let output = strategy.parse(&synced_entity, decoded);

        // Assert

        assert_eq!(1, output.references.len());
        assert_eq!(cell_id, output.references[0].id);
        assert!(output.references[0].repair.is_none());
    }
}
