use crate::{
    Guid,
    common::repository_error::RepositoryError,
    file_system::{entities::file::File, value_objects::file_system_item_name::FileSystemItemName},
};
use async_trait::async_trait;

#[async_trait]
pub trait FileRepository: Send + Sync {
    async fn get_by_id(&self, id: Guid) -> Result<File, RepositoryError>;
    async fn get_all_files(&self) -> Result<Vec<File>, RepositoryError>;
    async fn get_folder_files(&self, parent_folder_id: Guid) -> Result<Vec<File>, RepositoryError>;
    async fn exists(
        &self,
        parent_id: Option<Guid>,
        name: &FileSystemItemName,
    ) -> Result<bool, RepositoryError>;
    async fn create(&self, file: &File) -> Result<(), RepositoryError>;
    async fn update(&self, file: &File) -> Result<(), RepositoryError>;
    /// Note that deleting the file deletes the cells and all repetitions
    /// associated with it.
    async fn delete_by_id(&self, id: Guid) -> Result<(), RepositoryError>;
}
