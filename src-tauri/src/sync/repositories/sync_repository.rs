use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::{
    Guid,
    common::repository_error::RepositoryError,
    sync::entities::{deleted_entity::DeletedEntity, synced_entity::SyncedEntity},
};

#[async_trait]
pub trait SyncRepository: Send + Sync {
    async fn apply_deleted_entity(
        &self,
        deleted_entity: DeletedEntity,
    ) -> Result<u64, RepositoryError>;

    async fn get_all_deleted_entities_on_or_after(
        &self,
        deleted_date: DateTime<Utc>,
    ) -> Result<Vec<DeletedEntity>, RepositoryError>;

    async fn is_entity_deleted(&self, entity_id: Guid) -> Result<bool, RepositoryError>;

    async fn update_deleted_entity_deleted_date(
        &self,
        entity_id: Guid,
        date: DateTime<Utc>,
    ) -> Result<(), RepositoryError>;

    /// Deletes a synced entity from its table.
    async fn delete_synced_entity(&self, entity: &SyncedEntity) -> Result<(), RepositoryError>;
}
