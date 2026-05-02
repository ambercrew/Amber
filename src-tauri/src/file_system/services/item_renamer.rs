use async_trait::async_trait;
use thiserror::Error;

use crate::{
    Guid, common::repository_error::RepositoryError,
    file_system::value_objects::file_system_item_name::FileSystemItemName,
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum FolderRenamerError {
    #[error("The folder with the name '{name}' already exists!")]
    FolderExists { name: String },
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait FolderRenamer: Send + Sync {
    async fn rename_folder(
        &self,
        folder_id: Guid,
        new_name: FileSystemItemName,
    ) -> Result<(), FolderRenamerError>;
}

#[derive(Error, Debug, PartialEq, Eq)]
pub enum FileRenamerError {
    #[error("The file with the name '{name}' already exists!")]
    FileExists { name: String },
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait FileRenamer: Send + Sync {
    async fn rename_file(
        &self,
        file_id: Guid,
        new_name: FileSystemItemName,
    ) -> Result<(), FileRenamerError>;
}
