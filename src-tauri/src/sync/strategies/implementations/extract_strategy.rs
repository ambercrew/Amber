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
    incremental_reading::extracts::{
        entities::extract::Extract, repositories::extract_repository::ExtractRepository,
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
pub struct DefaultExtractStrategy {
    extract_repository: Arc<dyn ExtractRepository>,
}

#[async_trait]
impl SyncEntityStrategy for DefaultExtractStrategy {
    type Input = generated_code::Extract;
    type Entity = Extract;

    fn parse(
        &self,
        synced_entity: &SyncedEntity,
        decoded_entity: Self::Input,
    ) -> ParseSyncedEntityOutput<Self::Entity> {
        let entity = Extract::new_unchecked(
            synced_entity.entity_id,
            synced_entity.created_date,
            decoded_entity
                .modified_date
                .unwrap()
                .into_datetime()
                .unwrap(),
            Guid::parse_str(&decoded_entity.cell_id).unwrap(),
            serde_json::from_str(&decoded_entity.status).unwrap(),
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
        self.extract_repository
            .upsert_with_modified_date_if_modified_before(&entity, entity.modified_date())
            .await
            .map_err(Into::into)
    }

    async fn get_sync_dtos_modified_since(
        &self,
        since: DateTime<Utc>,
    ) -> Result<Vec<SyncEntityDto>, SyncEntityStrategyError> {
        let extracts = self
            .extract_repository
            .get_all_modified_on_or_after(since)
            .await?;
        Ok(extracts
            .into_iter()
            .map(|e| SyncEntityDto {
                entity_id: e.id(),
                created_date: e.created_date(),
                entity_type: EntityType::Extract,
                data: generated_code::Extract {
                    modified_date: Some(e.modified_date().into_timestamp()),
                    cell_id: e.cell_id().to_string(),
                    status: serde_json::to_string(e.status()).unwrap(),
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
        common::extensions::into_timestamp::IntoTimestamp,
        generated_code,
        incremental_reading::extracts::{
            entities::extract::ExtractStatus, repositories::extract_repository::ExtractRepository,
        },
        infrastructure::repositories::sqlite::sqlite_extract_repository::SqliteExtractRepository,
        sync::{
            entities::synced_entity::{EntityType, SyncedEntity},
            strategies::sync_entity_strategy::SyncEntityStrategy,
        },
        test_utils::create_test_injector,
    };

    async fn make_strategy()
    -> Arc<dyn SyncEntityStrategy<Input = generated_code::Extract, Entity = Extract>> {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn ExtractRepository, SqliteExtractRepository);
        register_scope!(
            injector,
            dyn SyncEntityStrategy<Input = generated_code::Extract, Entity = Extract>,
            DefaultExtractStrategy
        );
        injector
            .start_scope()
            .resolve::<dyn SyncEntityStrategy<Input = generated_code::Extract, Entity = Extract>>()
            .await
    }

    fn make_synced_entity() -> SyncedEntity {
        SyncedEntity {
            user_id: Guid::new_v4(),
            entity_id: Guid::new_v4(),
            created_date: Utc::now(),
            last_sync_date: Utc::now(),
            entity_type: EntityType::Extract,
            data: String::new(),
        }
    }

    #[tokio::test]
    async fn parse_with_cell_id_reference_is_required_without_repair_fn() {
        // Arrange

        let strategy = make_strategy().await;
        let synced_entity = make_synced_entity();
        let cell_id = Guid::new_v4();
        let decoded = generated_code::Extract {
            modified_date: Some(Utc::now().into_timestamp()),
            cell_id: cell_id.to_string(),
            status: serde_json::to_string(&ExtractStatus::Pending).unwrap(),
        };

        // Act

        let output = strategy.parse(&synced_entity, decoded);

        // Assert

        assert_eq!(1, output.references.len());
        assert_eq!(cell_id, output.references[0].id);
        assert!(output.references[0].repair.is_none());
    }
}
