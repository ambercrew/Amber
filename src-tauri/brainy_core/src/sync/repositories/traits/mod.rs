use async_trait::async_trait;

use crate::{common::repository_error::RepositoryError, generated_code::DeletedEntity};

#[async_trait]
pub trait DeletedEntityRepository: Send + Sync {
    async fn apply_deleted_entity(
        &self,
        deleted_entity: DeletedEntity,
    ) -> Result<(), RepositoryError>;
}
