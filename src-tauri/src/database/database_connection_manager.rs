use async_trait::async_trait;
use thiserror::Error;

// TODO: does it belong here?
#[derive(Error, Debug, PartialEq, Eq)]
pub enum DatabaseConnectionManagerError {
    #[error("Error changing the database: {0}")]
    ErrorChangingDatabase(String),
}

#[async_trait]
pub trait DatabaseConnectionManager: Send + Sync {
    async fn change_database_location(
        &self,
        path: &str,
    ) -> Result<(), DatabaseConnectionManagerError>;
}
