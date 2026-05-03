use async_trait::async_trait;
use thiserror::Error;

use crate::{
    Guid, common::repository_error::RepositoryError,
    file_system::value_objects::file_system_item_name::FileSystemItemName,
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum FolderCreatorError {
    #[error("A folder named '{name}' already exists!")]
    FolderExists { name: String },
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait FolderCreator: Send + Sync {
    async fn create_folder(
        &self,
        parent_id: Option<Guid>,
        name: FileSystemItemName,
    ) -> Result<Guid, FolderCreatorError>;
}

#[derive(Error, Debug, PartialEq, Eq)]
pub enum FileCreatorError {
    #[error("A file named '{name}' already exists!")]
    FileExists { name: String },
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait FileCreator: Send + Sync {
    async fn create_file(
        &self,
        parent_id: Option<Guid>,
        name: FileSystemItemName,
    ) -> Result<Guid, FileCreatorError>;
}
