use async_trait::async_trait;
use thiserror::Error;

use crate::{
    Guid, common::repository_error::RepositoryError,
    file_system::value_objects::exported_item::ExportedItem,
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum ItemExporterError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait ItemExporter: Send + Sync {
    async fn convert_folder_to_exported_item(
        &self,
        folder_id: Guid,
    ) -> Result<ExportedItem, ItemExporterError>;

    async fn convert_file_to_exported_item(
        &self,
        file_id: Guid,
    ) -> Result<ExportedItem, ItemExporterError>;
}
