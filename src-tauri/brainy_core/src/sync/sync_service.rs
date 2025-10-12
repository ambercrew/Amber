use std::{collections::HashMap, sync::Arc};

use thiserror::Error;

use crate::{
    Guid,
    cells::{
        entities::{cell::Cell, repetition::Repetition, review::Review},
        repositories::traits::{
            cell_repository::CellRepository, review_repository::ReviewRepository,
        },
    },
    common::{extensions::to_datetime_ext::ToDateTimeExt, repository_error::RepositoryError},
    file_system::{
        entities::{file::File, folder::Folder},
        repositories::traits::{
            file_repository::FileRepository, folder_repository::FolderRepository,
        },
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

        // TODO: move all conversion code to From<type> traint in the files
        for folder in sync_object.folders {
            let modified_date = folder.modified_date.unwrap().to_datetime_utc();
            let entity = Folder::from(folder);
            self.folder_repository
                .upsert_with_modified_date_if_modified_before(&entity, modified_date)
                .await?;
        }

        for file in sync_object.files {
            let modified_date = file.modified_date.unwrap().to_datetime_utc();
            let entity = File::from(file);
            self.file_repository
                .upsert_with_modified_date_if_modified_before(&entity, modified_date)
                .await?;
        }

        let mut repetitions_by_cell_id = HashMap::<Guid, Vec<Repetition>>::new();

        for repetition in sync_object.repetitions {
            let entity = Repetition::from(repetition);
            repetitions_by_cell_id
                .entry(entity.cell_id())
                .or_default()
                .push(entity);
        }

        // TODO: handle duplicate cell index in a file
        for cell in sync_object.cells {
            let id = Guid::parse_str(&cell.id).unwrap();

            // TODO: use from trait
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

        // for repetitions in repetitions_by_cell_id.values() {
        // for repetition in repetitions {
        // TODO: handle repettions that are updated by themselfs
        // }
        // }

        for review in sync_object.reviews {
            let modified_date = review.modified_date.unwrap().to_datetime_utc();
            let entity = Review::from(review);
            self.review_repository
                .upsert_with_modified_date_if_modified_before(&entity, modified_date)
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
