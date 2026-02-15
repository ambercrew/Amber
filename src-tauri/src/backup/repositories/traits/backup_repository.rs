use async_trait::async_trait;

use crate::common::repository_error::RepositoryError;

#[async_trait]
pub trait BackupRepository: Send + Sync {
    async fn create_backup(&self, path: &str) -> Result<(), RepositoryError>;
}
