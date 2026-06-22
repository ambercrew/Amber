use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::{
    Guid,
    common::repository_error::RepositoryError,
    incremental_reading::{
        dto::cell_with_pending_extracts_dto::CellWithPendingExtractsDto,
        extracts::entities::extract::{Extract, ExtractStatus},
    },
};

#[async_trait]
pub trait ExtractRepository: Send + Sync {
    async fn get_by_id(&self, id: Guid) -> Result<Option<Extract>, RepositoryError>;
    async fn get_by_cell_id(&self, cell_id: Guid) -> Result<Vec<Extract>, RepositoryError>;
    async fn count_by_cell_id_and_status(
        &self,
        cell_id: Guid,
        status: &ExtractStatus,
    ) -> Result<u32, RepositoryError>;
    /// Returns the incremental reading cells that have at least one pending extract,
    /// along with their file id, title and pending extract count.
    async fn get_cells_with_pending_extracts(
        &self,
    ) -> Result<Vec<CellWithPendingExtractsDto>, RepositoryError>;
    async fn create(&self, extract: &Extract) -> Result<(), RepositoryError>;
    async fn update(&self, extract: &Extract) -> Result<(), RepositoryError>;
    async fn delete_by_id(&self, id: Guid) -> Result<(), RepositoryError>;
    async fn get_all_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<Extract>, RepositoryError>;
    async fn upsert_with_modified_date_if_modified_before(
        &self,
        extract: &Extract,
        modified_date: DateTime<Utc>,
    ) -> Result<u64, RepositoryError>;
}
