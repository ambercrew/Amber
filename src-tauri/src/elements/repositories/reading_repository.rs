use async_trait::async_trait;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::reading::{Reading, ReadingSplit, ReadingSplitId, ReadingSplitMeta};
use crate::elements::value_objects::reading_position::ReadingPosition;

#[async_trait]
pub trait ReadingRepository: Send + Sync {
    async fn get_all(&self) -> Result<Vec<Reading>, RepositoryError>;
    async fn get_by_id(&self, id: Uuid) -> Result<Reading, RepositoryError>;
    async fn create(
        &self,
        reading: Reading,
        splits: Vec<ReadingSplit>,
    ) -> Result<(), RepositoryError>;
    /// Lightweight per-split metadata (`seq` + content length), ordered by `seq`.
    /// Does not load split content — used to lay out the reading view.
    async fn get_split_manifest(
        &self,
        reading_id: Uuid,
    ) -> Result<Vec<ReadingSplitMeta>, RepositoryError>;
    /// Content of a single split, loaded on demand as it is about to be mounted.
    async fn get_split_content(&self, split_id: ReadingSplitId) -> Result<String, RepositoryError>;
    async fn update_content(
        &self,
        split_id: ReadingSplitId,
        content: String,
    ) -> Result<(), RepositoryError>;
    async fn update_position(
        &self,
        reading_id: Uuid,
        position: ReadingPosition,
    ) -> Result<(), RepositoryError>;
    async fn update_a_factor(&self, reading_id: Uuid, a_factor: f32)
    -> Result<(), RepositoryError>;
}
