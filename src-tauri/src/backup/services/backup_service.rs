use async_trait::async_trait;
use thiserror::Error;

use crate::{
    SourceError, common::repository_error::RepositoryError,
    database::database_connection_manager::DatabaseConnectionManagerError,
};

#[derive(Error, Debug)]
pub enum BackupServiceError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error(transparent)]
    DatabaseConnectionManager(#[from] DatabaseConnectionManagerError),
    #[error("Failed to list entries in the settings folder")]
    CannotListEntriesInFolder(#[source] SourceError),
}

impl PartialEq for BackupServiceError {
    fn eq(&self, other: &Self) -> bool {
        std::mem::discriminant(self) == std::mem::discriminant(other)
    }
}

impl Eq for BackupServiceError {}

pub const TIME_BETWEEN_BACKUPS_IN_MINUTES: u64 = 120;

#[async_trait]
pub trait BackupService: Send + Sync {
    async fn ensure_backup(&self) -> Result<(), BackupServiceError>;
}
