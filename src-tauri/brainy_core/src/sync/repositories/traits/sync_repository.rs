use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::{
    common::repository_error::RepositoryError, sync::entities::deleted_entity::DeletedEntity,
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
}
