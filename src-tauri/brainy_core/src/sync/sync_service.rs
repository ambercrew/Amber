use std::sync::Arc;

use chrono::{DateTime, Utc};
use prost_types::Timestamp;
use thiserror::Error;

use crate::{
    cells::repositories::traits::{
        cell_repository::CellRepository, review_repository::ReviewRepository,
    }, common::repository_error::RepositoryError, file_system::{
        entities::folder::Folder,
        repositories::traits::{
            file_repository::FileRepository, folder_repository::FolderRepository,
        },
        value_objects::file_system_item_name::FileSystemItemName,
    }, generated_code::SyncObject, local_configurations::repositories::traits::LocalConfigurationRepository, Guid
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum SyncError {
    #[error("{0}")]
    UnknownRepositoryError(#[from] RepositoryError),
}

pub struct SyncService {
    local_configurations_repository: Arc<dyn LocalConfigurationRepository>,
    folder_repository: Arc<dyn FolderRepository>,
    file_repository: Arc<dyn FileRepository>,
    cell_repository: Arc<dyn CellRepository>,
    review_repository: Arc<dyn ReviewRepository>,
}

impl SyncService {
    pub fn new(
        local_configurations_repository: Arc<dyn LocalConfigurationRepository>,
        folder_repository: Arc<dyn FolderRepository>,
        file_repository: Arc<dyn FileRepository>,
        cell_repository: Arc<dyn CellRepository>,
        review_repository: Arc<dyn ReviewRepository>,
    ) -> Self {
        Self {
            local_configurations_repository,
            folder_repository,
            file_repository,
            cell_repository,
            review_repository,
        }
    }

    // TODO: unit test
    pub async fn process_sync_object(&self, sync_object: SyncObject) -> Result<(), SyncError> {
        for folder in sync_object.folders {
            // TODO: parent id should be nullable in proto file
            let folder_entity = Folder::new_unchecked(
                Some(Guid::parse_str(&folder.id).unwrap()),
                Some(Guid::parse_str(&folder.id).unwrap()),
                FileSystemItemName::new_unchecked(folder.name),
            );
            self.folder_repository
                .upsert_with_modified_date_if_modified_before(
                    &folder_entity,
                    folder.modified_date.unwrap().to_datetime_utc(),
                ).await?;
        }

        Ok(())
    }
}

trait ToDateTimeExt {
    fn to_datetime_utc(&self) -> DateTime<Utc>;
}

impl ToDateTimeExt for Timestamp {
    fn to_datetime_utc(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_timestamp(self.seconds, self.nanos as u32)
            .expect("Failed to convert timestamp")
    }
}

// TODO: deletion
// TODO: updating entities
