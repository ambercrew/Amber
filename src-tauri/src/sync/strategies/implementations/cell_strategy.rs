use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    backend::backend_dto::SyncEntityDto,
    cells::{
        entities::cell::Cell, repositories::cell_repository::CellRepository,
        services::cell_invariants_enforcer::CellInvariantsEnforcer,
    },
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
pub struct DefaultCellStrategy {
    cell_repository: Arc<dyn CellRepository>,
    cell_invariants_enforcer: Arc<dyn CellInvariantsEnforcer>,
}

#[async_trait]
impl SyncEntityStrategy for DefaultCellStrategy {
    type Input = generated_code::Cell;
    type Entity = Cell;

    fn parse(
        &self,
        synced_entity: &SyncedEntity,
        decoded_entity: Self::Input,
    ) -> ParseSyncedEntityOutput<Self::Entity> {
        let entity = Cell::new_unchecked(
            synced_entity.entity_id,
            synced_entity.created_date,
            decoded_entity
                .modified_date
                .unwrap()
                .into_datetime()
                .unwrap(),
            Guid::parse_str(&decoded_entity.file_id).unwrap(),
            decoded_entity.content,
            serde_json::from_str(&decoded_entity.cell_type).unwrap(),
            decoded_entity.index,
            decoded_entity.searchable_content,
            Vec::new(),
        );

        let file_id = entity.file_id();
        ParseSyncedEntityOutput {
            entity,
            references: vec![ParseSyncedEntityReference {
                id: file_id,
                repair: None,
            }],
        }
    }

    async fn upsert(&self, entity: Self::Entity) -> Result<u64, SyncEntityStrategyError> {
        let result = self
            .cell_repository
            .upsert_cell_without_repetition_and_with_modified_date_if_modified_before(
                &entity,
                entity.modified_date(),
            )
            .await?;
        self.cell_invariants_enforcer
            .enforce_cell_invariants_on_cell(entity.id())
            .await?;
        Ok(result)
    }

    async fn get_sync_dtos_modified_since(
        &self,
        since: DateTime<Utc>,
    ) -> Result<Vec<SyncEntityDto>, SyncEntityStrategyError> {
        let cells = self
            .cell_repository
            .get_all_cells_modified_on_or_after(since)
            .await?;
        Ok(cells
            .into_iter()
            .map(|c| SyncEntityDto {
                entity_id: c.id(),
                created_date: c.created_date(),
                entity_type: EntityType::Cell,
                data: generated_code::Cell {
                    modified_date: Some(c.modified_date().into_timestamp()),
                    index: c.index(),
                    content: c.content().to_string(),
                    file_id: c.file_id().to_string(),
                    cell_type: serde_json::to_string(&c.cell_type()).unwrap(),
                    searchable_content: c.searchable_content().to_string(),
                }
                .into_base64(),
            })
            .collect())
    }
}
