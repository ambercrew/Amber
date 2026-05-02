use async_trait::async_trait;
use thiserror::Error;

use crate::{
    Guid,
    cells::services::cell_creator::CellCreatorError,
    common::repository_error::RepositoryError,
    file_system::{
        services::item_creator::{FileCreatorError, FolderCreatorError},
        value_objects::exported_item::ExportedItem,
    },
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum ItemImporterError {
    #[error(transparent)]
    FolderCreator(#[from] FolderCreatorError),
    #[error(transparent)]
    FileCreator(#[from] FileCreatorError),
    #[error(transparent)]
    CellCreator(#[from] CellCreatorError),
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait ItemImporter: Send + Sync {
    async fn import_exported_item(
        &self,
        import_into_folder_id: Guid,
        exported_item: ExportedItem,
    ) -> Result<(), ItemImporterError>;
}
