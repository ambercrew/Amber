use async_trait::async_trait;
use thiserror::Error;

use crate::{Guid, common::repository_error::RepositoryError};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum FolderMoverError {
    #[error("The folder with the name '{name}' already exists!")]
    FolderExists { name: String },
    #[error("Cannot move folder to a nested folder within the current folder")]
    CannotMoveChildIntoInnerFolder,
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait FolderMover: Send + Sync {
    async fn move_folder(
        &self,
        folder_id: Guid,
        destination_folder_id: Option<Guid>,
    ) -> Result<(), FolderMoverError>;
}

#[derive(Error, Debug, PartialEq, Eq)]
pub enum FileMoverError {
    #[error("The file with the name '{name}' already exists!")]
    FileExists { name: String },
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait FileMover: Send + Sync {
    async fn move_file(
        &self,
        file_id: Guid,
        destination_folder_id: Option<Guid>,
    ) -> Result<(), FileMoverError>;
}
