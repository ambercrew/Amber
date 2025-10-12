use std::sync::Arc;

use async_trait::async_trait;
use thiserror::Error;

use crate::{
    cells::repositories::traits::{
        cell_repository::CellRepository, review_repository::ReviewRepository,
    },
    file_system::repositories::traits::{
        file_repository::FileRepository, folder_repository::FolderRepository,
    },
    local_configurations::repositories::traits::LocalConfigurationRepository, sync::repositories::traits::DeletedEntityRepository,
};

#[derive(Debug, Error)]
pub enum RepositoriesContextError {
    #[error("An unknown error has happened!")]
    UnknownError(String),
}

#[async_trait]
pub trait RepositoriesContext: Send + Sync {
    fn folder_repository(&self) -> Arc<dyn FolderRepository>;
    fn file_repository(&self) -> Arc<dyn FileRepository>;
    fn cell_repository(&self) -> Arc<dyn CellRepository>;
    fn review_repository(&self) -> Arc<dyn ReviewRepository>;
    fn local_configuration_repository(&self) -> Arc<dyn LocalConfigurationRepository>;
    fn deleted_entity_repository(&self) -> Arc<dyn DeletedEntityRepository>;
    /// All changes are put automatically inside a transaction, this this
    /// method commit the transactio.
    async fn save_changes(&mut self) -> Result<(), RepositoriesContextError>;
}
