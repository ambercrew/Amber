use std::{collections::HashMap, sync::Arc};

use chrono::{DateTime, Utc};
use prost_types::Timestamp;
use thiserror::Error;

use crate::{
    Guid,
    cells::{
        entities::{cell::Cell, repetition::Repetition, review::Review},
        repositories::traits::{
            cell_repository::CellRepository, review_repository::ReviewRepository,
        },
    },
    common::repository_error::RepositoryError,
    file_system::{
        entities::{file::File, folder::Folder},
        repositories::traits::{
            file_repository::FileRepository, folder_repository::FolderRepository,
        },
        value_objects::file_system_item_name::FileSystemItemName,
    },
    generated_code::SyncObject,
    sync::repositories::traits::DeletedEntityRepository,
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum SyncError {
    #[error("{0}")]
    UnknownRepositoryError(#[from] RepositoryError),
}

pub struct SyncService {
    folder_repository: Arc<dyn FolderRepository>,
    file_repository: Arc<dyn FileRepository>,
    cell_repository: Arc<dyn CellRepository>,
    review_repository: Arc<dyn ReviewRepository>,
    deleted_entity_repository: Arc<dyn DeletedEntityRepository>,
}

impl SyncService {
    pub fn new(
        folder_repository: Arc<dyn FolderRepository>,
        file_repository: Arc<dyn FileRepository>,
        cell_repository: Arc<dyn CellRepository>,
        review_repository: Arc<dyn ReviewRepository>,
        deleted_entity_repository: Arc<dyn DeletedEntityRepository>,
    ) -> Self {
        Self {
            folder_repository,
            file_repository,
            cell_repository,
            review_repository,
            deleted_entity_repository,
        }
    }

    // TODO: unit test (LWW, files and folders with same name, repetitions, deleted entities)
    pub async fn process_sync_object(&self, sync_object: SyncObject) -> Result<(), SyncError> {
        // TODO: handle file and folders with same name, (merge into same name and replace all
        // existing with new name, order by id so that the id is the same)

        for folder in sync_object.folders {
            let entity = Folder::new_unchecked(
                Some(Guid::parse_str(&folder.id).unwrap()),
                folder
                    .parent_id
                    .map(|parent_id| Guid::parse_str(&parent_id).unwrap()),
                FileSystemItemName::new_unchecked(folder.name),
            );
            self.folder_repository
                .upsert_with_modified_date_if_modified_before(
                    &entity,
                    folder.modified_date.unwrap().to_datetime_utc(),
                )
                .await?;
        }

        for file in sync_object.files {
            let entity = File::new_unchecked(
                Some(Guid::parse_str(&file.id).unwrap()),
                file.parent_id
                    .map(|parent_id| Guid::parse_str(&parent_id).unwrap()),
                FileSystemItemName::new_unchecked(file.name),
            );
            self.file_repository
                .upsert_with_modified_date_if_modified_before(
                    &entity,
                    file.modified_date.unwrap().to_datetime_utc(),
                )
                .await?;
        }

        let mut repetitions_by_cell_id = HashMap::<Guid, Vec<Repetition>>::new();

        for repetition in sync_object.repetitions {
            let entity = Repetition::new_unchecked(
                Guid::parse_str(&repetition.id).unwrap(),
                Guid::parse_str(&repetition.file_id).unwrap(),
                Guid::parse_str(&repetition.cell_id).unwrap(),
                repetition.due.unwrap().to_datetime_utc(),
                repetition.stability,
                repetition.difficulty,
                repetition.elapsed_days,
                repetition.scheduled_days,
                repetition.reps,
                repetition.lapses,
                serde_json::from_str(&repetition.state).unwrap(),
                repetition
                    .last_review
                    .map(|last_review| last_review.to_datetime_utc()),
                repetition.additional_content,
            );
            repetitions_by_cell_id
                .entry(entity.cell_id())
                .or_default()
                .push(entity);
        }

        for cell in sync_object.cells {
            let id = Guid::parse_str(&cell.id).unwrap();

            let entity = Cell::new_unchecked(
                Some(id),
                Guid::parse_str(&cell.file_id).unwrap(),
                cell.content,
                serde_json::from_str(&cell.cell_type).unwrap(),
                cell.cell_index,
                cell.searchable_content,
                // All repetitions are sent each time a cell is updated.
                repetitions_by_cell_id.remove(&id).unwrap_or_default(),
            );
            self.cell_repository
                .upsert_with_modified_date_if_modified_before(
                    &entity,
                    cell.modified_date.unwrap().to_datetime_utc(),
                )
                .await?;
        }

        // TODO: repetitions without updated cell, upsert them

        for review in sync_object.reviews {
            let entity = Review::new_unchecked(
                Some(Guid::parse_str(&review.id).unwrap()),
                review.cell_id.map(|r| Guid::parse_str(&r).unwrap()),
                review.study_time,
                review.date.unwrap().to_datetime_utc(),
                serde_json::from_str(&review.rating).unwrap(),
            );
            self.review_repository
                .upsert_with_modified_date_if_modified_before(
                    &entity,
                    review.modified_date.unwrap().to_datetime_utc(),
                )
                .await?;
        }

        for deleted_entity in sync_object.deleted_entities {
            self.deleted_entity_repository
                .apply_deleted_entity(deleted_entity)
                .await?;
        }

        Ok(())
    }

    // TODO: on sending always send all repetitions with a cell (should be default based on trigger)
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
