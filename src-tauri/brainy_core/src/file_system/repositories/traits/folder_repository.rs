use crate::{
    Guid,
    common::repository_error::RepositoryError,
    file_system::{
        entities::folder::Folder, value_objects::file_system_item_name::FileSystemItemName,
    },
};
use async_trait::async_trait;
use chrono::{DateTime, Utc};

#[async_trait]
pub trait FolderRepository: Send + Sync {
    async fn get_by_id(&self, id: Guid) -> Result<Folder, RepositoryError>;
    async fn get_all_folders(&self) -> Result<Vec<Folder>, RepositoryError>;
    async fn get_subfolders(&self, parent_folder_id: Guid) -> Result<Vec<Folder>, RepositoryError>;
    async fn exists(
        &self,
        parent_id: Option<Guid>,
        name: &FileSystemItemName,
    ) -> Result<bool, RepositoryError>;
    async fn create(&self, folder: &Folder) -> Result<(), RepositoryError>;
    async fn update(&self, folder: &Folder) -> Result<(), RepositoryError>;
    async fn upsert_with_modified_date_if_modified_before(
        &self,
        folder: &Folder,
        date: DateTime<Utc>,
    ) -> Result<(), RepositoryError>;
    /// Note that deleting the folders deletes all subfolders and files inside
    /// it recursively, including the cells and all repetitions associated
    /// with the files.
    async fn delete_by_id(&self, id: Guid) -> Result<(), RepositoryError>;
}
