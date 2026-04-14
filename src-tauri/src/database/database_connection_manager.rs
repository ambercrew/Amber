use std::path::Path;

use async_trait::async_trait;
use thiserror::Error;

#[cfg(test)]
use mockall::automock;

use crate::settings::value_objects::database_location::DatabaseLocation;

#[derive(Error, Debug, PartialEq, Eq)]
pub enum DatabaseConnectionManagerError {
    #[error("Error changing the database: {0}")]
    ErrorChangingDatabase(String),
    #[error("{0}")]
    Unknown(String),
}

#[async_trait]
#[cfg_attr(test, automock)]
pub trait DatabaseConnectionManager: Send + Sync {
    async fn connect_to_database(
        &self,
        database_location: DatabaseLocation,
    ) -> Result<(), DatabaseConnectionManagerError>;

    async fn move_database_to(
        &self,
        new_database_location: DatabaseLocation,
    ) -> Result<(), DatabaseConnectionManagerError>;

    async fn copy_database_to(&self, path: &Path) -> Result<(), DatabaseConnectionManagerError>;
}
