use std::{collections::HashSet, sync::Arc};

use base64::{Engine as _, engine::general_purpose};
use chrono::{DateTime, TimeZone, Utc};
use prost::Message;
use thiserror::Error;

use crate::{
    Guid,
    backend::{
        models::SyncEntityDto,
        traits::brainy_backend_client::{BrainyBackendClient, BrainyBackendClientError},
    },
    cells::{
        cell_service::{CellService, CellServiceError},
        entities::{cell::Cell, repetition::Repetition, review::Review},
        repositories::traits::{
            cell_repository::CellRepository, review_repository::ReviewRepository,
        },
    },
    common::{
        extensions::{
            into_base64::IntoBase64, into_datetime::IntoDateTime, into_timestamp::IntoTimestamp,
        },
        repository_error::RepositoryError,
    },
    file_system::{
        entities::{file::File, folder::Folder},
        repositories::traits::{
            file_repository::FileRepository, folder_repository::FolderRepository,
        },
        value_objects::file_system_item_name::FileSystemItemName,
    },
    fsrs::entities::{
        fsrs_profile::FsrsProfile, repositories::traits::fsrs_repository::FsrsRepository,
    },
    generated_code::{self},
    local_configurations::{
        entities::LocalConfiguration,
        repositories::traits::local_configuration_repository::LocalConfigurationRepository,
    },
    sync::{
        entities::{
            deleted_entity::DeletedEntity,
            synced_entity::{EntityType, SyncedEntity},
        },
        repositories::traits::sync_repository::SyncRepository,
    },
};

const LAST_SYNC_DATE_CONFIGURATION_NAME: &str = "LAST_SYNC_DATE";

#[derive(Error, Debug, PartialEq, Eq)]
pub enum SyncError {
    #[error("{0}")]
    UnknownRepositoryError(#[from] RepositoryError),
    #[error("{0}")]
    ClientError(#[from] BrainyBackendClientError),
    #[error("{0}")]
    CellServiceError(#[from] CellServiceError),
}

pub struct SyncService {
    backend_client: Arc<dyn BrainyBackendClient>,
    folder_repository: Arc<dyn FolderRepository>,
    file_repository: Arc<dyn FileRepository>,
    cell_repository: Arc<dyn CellRepository>,
    review_repository: Arc<dyn ReviewRepository>,
    sync_repository: Arc<dyn SyncRepository>,
    local_configuration_repository: Arc<dyn LocalConfigurationRepository>,
    fsrs_repository: Arc<dyn FsrsRepository>,
    cell_service: Arc<CellService>,
}

impl SyncService {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        backend_client: Arc<dyn BrainyBackendClient>,
        folder_repository: Arc<dyn FolderRepository>,
        file_repository: Arc<dyn FileRepository>,
        cell_repository: Arc<dyn CellRepository>,
        review_repository: Arc<dyn ReviewRepository>,
        sync_repository: Arc<dyn SyncRepository>,
        local_configuration_repository: Arc<dyn LocalConfigurationRepository>,
        fsrs_repository: Arc<dyn FsrsRepository>,
        cell_service: Arc<CellService>,
    ) -> Self {
        Self {
            backend_client,
            folder_repository,
            file_repository,
            cell_repository,
            review_repository,
            sync_repository,
            local_configuration_repository,
            fsrs_repository,
            cell_service,
        }
    }

    /// Gets the entities from the backend since last sync and upload all changed
    /// entities that are not overwritten from the sync.
    pub async fn sync_with_backend(&self) -> Result<(), SyncError> {
        let last_sync_date = self
            .local_configuration_repository
            .get_by_name(LAST_SYNC_DATE_CONFIGURATION_NAME)
            .await?
            .map(|conf| {
                DateTime::parse_from_rfc3339(&conf.value)
                    .unwrap()
                    .with_timezone(&Utc)
            })
            .unwrap_or(Utc.with_ymd_and_hms(2000, 1, 1, 0, 0, 0).unwrap());

        let mut sync_page = 0;
        // Contains a list of the entities that has been overwritten from the sync.
        let mut entities_changed_locally = HashSet::new();

        loop {
            let has_more = self
                .fetch_and_process_next_sync_page(
                    sync_page,
                    last_sync_date,
                    &mut entities_changed_locally,
                )
                .await?;
            if has_more {
                sync_page += 1;
            } else {
                break;
            }
        }

        self.send_unsynced_entities_since(last_sync_date, &entities_changed_locally)
            .await?;

        self.local_configuration_repository
            .upsert(&LocalConfiguration {
                name: LAST_SYNC_DATE_CONFIGURATION_NAME.to_string(),
                value: Utc::now().to_rfc3339(),
            })
            .await?;

        log::info!("Sync is completed.");

        Ok(())
    }

    /// This function fetches and process the next sync page.
    /// Returns whether there are more pages to sync or not.
    async fn fetch_and_process_next_sync_page(
        &self,
        sync_page: u32,
        last_sync_date: DateTime<Utc>,
        entities_changed_locally: &mut HashSet<Guid>,
    ) -> Result<bool, SyncError> {
        let result = self
            .backend_client
            .get_synced_entities_after_ordered_by_created_date(last_sync_date, sync_page)
            .await?;

        for synced_entity in result.synced_entities {
            let entity_id = synced_entity.entity_id;
            let change_count = self.process_synced_entity(synced_entity).await?;
            if change_count > 0 {
                entities_changed_locally.insert(entity_id);
            }
        }

        Ok(result.has_more)
    }

    async fn process_synced_entity(&self, synced_entity: SyncedEntity) -> Result<u64, SyncError> {
        log::info!(
            "Processing synced entity with id {} and of type {:?}",
            synced_entity.entity_id,
            synced_entity.entity_type
        );

        let bytes = general_purpose::STANDARD
            .decode(&synced_entity.data)
            .unwrap();

        let change_count = match synced_entity.entity_type {
            EntityType::FsrsProfile => {
                let fsrs_profile = generated_code::FsrsProfile::decode(&bytes[..]).unwrap();
                let entity = FsrsProfile::new_unchecked(
                    synced_entity.entity_id,
                    synced_entity.created_date,
                    fsrs_profile.modified_date.unwrap().into_datetime(),
                    fsrs_profile.name,
                    fsrs_profile.request_retention,
                    fsrs_profile.maximum_interval,
                    fsrs_profile.weights,
                );

                #[cfg(debug_assertions)]
                log::info!("Parsed entity {:#?}", entity);

                self.fsrs_repository
                    .upsert_with_modified_date_if_modified_before(
                        &entity,
                        fsrs_profile.modified_date.unwrap().into_datetime(),
                    )
                    .await?
            }
            EntityType::Folder => {
                let folder = generated_code::Folder::decode(&bytes[..]).unwrap();
                let entity = Folder::new_unchecked(
                    synced_entity.entity_id,
                    synced_entity.created_date,
                    folder.modified_date.unwrap().into_datetime(),
                    folder.parent_id.map(|val| Guid::parse_str(&val).unwrap()),
                    FileSystemItemName::new_unchecked(folder.name),
                    folder.fsrs_profile_id.into(),
                );

                #[cfg(debug_assertions)]
                log::info!("Parsed entity {:#?}", entity);

                self.folder_repository
                    .upsert_with_modified_date_if_modified_before(
                        &entity,
                        folder.modified_date.unwrap().into_datetime(),
                    )
                    .await?
            }
            EntityType::File => {
                let file = generated_code::File::decode(&bytes[..]).unwrap();
                let entity = File::new_unchecked(
                    synced_entity.entity_id,
                    synced_entity.created_date,
                    file.modified_date.unwrap().into_datetime(),
                    file.parent_id.map(|val| Guid::parse_str(&val).unwrap()),
                    FileSystemItemName::new_unchecked(file.name),
                    file.fsrs_profile_id.into(),
                );

                #[cfg(debug_assertions)]
                log::info!("Parsed entity {:#?}", entity);

                self.file_repository
                    .upsert_with_modified_date_if_modified_before(
                        &entity,
                        file.modified_date.unwrap().into_datetime(),
                    )
                    .await?
            }
            EntityType::Cell => {
                let cell = generated_code::Cell::decode(&bytes[..]).unwrap();
                let entity = Cell::new_unchecked(
                    synced_entity.entity_id,
                    synced_entity.created_date,
                    cell.modified_date.unwrap().into_datetime(),
                    Guid::parse_str(&cell.file_id).unwrap(),
                    cell.content,
                    serde_json::from_str(&cell.cell_type).unwrap(),
                    cell.index,
                    cell.searchable_content,
                    Vec::new(),
                );

                #[cfg(debug_assertions)]
                log::info!("Parsed entity {:#?}", entity);

                let result = self
                    .cell_repository
                    .upsert_cell_without_repetition_and_with_modified_date_if_modified_before(
                        &entity,
                        cell.modified_date.unwrap().into_datetime(),
                    )
                    .await?;
                self.cell_service
                    .enforce_cell_invariants_on_cell(synced_entity.entity_id)
                    .await?;
                result
            }
            EntityType::Repetition => {
                let repetition = generated_code::Repetition::decode(&bytes[..]).unwrap();
                let entity = Repetition::new_unchecked(
                    synced_entity.entity_id,
                    synced_entity.created_date,
                    repetition.modified_date.unwrap().into_datetime(),
                    Guid::parse_str(&repetition.file_id).unwrap(),
                    Guid::parse_str(&repetition.cell_id).unwrap(),
                    repetition.due.unwrap().into_datetime(),
                    repetition.stability,
                    repetition.difficulty,
                    repetition.elapsed_days,
                    repetition.scheduled_days,
                    repetition.reps,
                    repetition.lapses,
                    serde_json::from_str(&repetition.state).unwrap(),
                    repetition.last_review.map(|value| value.into_datetime()),
                    repetition.additional_content,
                );

                #[cfg(debug_assertions)]
                log::info!("Parsed entity {:#?}", entity);

                self.cell_repository
                    .upsert_repetition_with_modified_date_if_modified_before(
                        &entity,
                        repetition.modified_date.unwrap().into_datetime(),
                    )
                    .await?
            }
            EntityType::Review => {
                let review = generated_code::Review::decode(&bytes[..]).unwrap();
                let entity = Review::new_unchecked(
                    synced_entity.entity_id,
                    synced_entity.created_date,
                    review.modified_date.unwrap().into_datetime(),
                    review.cell_id.map(|value| Guid::parse_str(&value).unwrap()),
                    review.study_time,
                    review.date.unwrap().into_datetime(),
                    serde_json::from_str(&review.rating).unwrap(),
                );

                #[cfg(debug_assertions)]
                log::info!("Parsed entity {:#?}", entity);

                self.review_repository
                    .upsert_with_modified_date_if_modified_before(
                        &entity,
                        review.modified_date.unwrap().into_datetime(),
                    )
                    .await?
            }
            EntityType::DeletedEntity => {
                let deleted_entity = generated_code::DeletedEntity::decode(&bytes[..]).unwrap();
                let entity = DeletedEntity::new(
                    synced_entity.entity_id,
                    deleted_entity.entity_name,
                    synced_entity.created_date,
                    deleted_entity.deleted_date.unwrap().into_datetime(),
                );

                #[cfg(debug_assertions)]
                log::info!("Parsed entity {:#?}", entity);

                self.sync_repository.apply_deleted_entity(entity).await?
            }
        };

        Ok(change_count)
    }

    /// Sends all entities with modified date after the last sync date, excluding
    /// entities given in the vector.
    async fn send_unsynced_entities_since(
        &self,
        last_sync_date: DateTime<Utc>,
        excluded_entities: &HashSet<Guid>,
    ) -> Result<(), SyncError> {
        log::info!("Sending all entities modified after date {last_sync_date} to sync.");

        let mut synced_entities = Vec::<SyncEntityDto>::new();

        for fsrs_profile in self
            .fsrs_repository
            .get_all_modified_on_or_after(last_sync_date)
            .await?
        {
            let data = generated_code::FsrsProfile {
                modified_date: Some(fsrs_profile.modified_date().into_timestamp()),
                name: fsrs_profile.name().to_string(),
                request_retention: fsrs_profile.request_retention(),
                maximum_interval: fsrs_profile.maximum_interval(),
                weights: fsrs_profile.weights().to_vec(),
            }
            .into_base64();

            let dto = SyncEntityDto {
                entity_id: fsrs_profile.id(),
                created_date: fsrs_profile.created_date(),
                entity_type: EntityType::FsrsProfile,
                data,
            };

            synced_entities.push(dto);
        }

        for folder in self
            .folder_repository
            .get_all_modified_on_or_after(last_sync_date)
            .await?
        {
            let data = generated_code::Folder {
                modified_date: Some(folder.modified_date().into_timestamp()),
                name: folder.name().to_string(),
                parent_id: folder.parent_id().map(|value| value.into()),
                fsrs_profile_id: Option::<Guid>::from(folder.fsrs_profile_choice())
                    .map(|id| id.into()),
            }
            .into_base64();

            let dto = SyncEntityDto {
                entity_id: folder.id(),
                created_date: folder.created_date(),
                entity_type: EntityType::Folder,
                data,
            };

            synced_entities.push(dto);
        }

        for file in self
            .file_repository
            .get_all_modified_on_or_after(last_sync_date)
            .await?
        {
            let data = generated_code::File {
                modified_date: Some(file.modified_date().into_timestamp()),
                name: file.name().to_string(),
                parent_id: file.parent_id().map(|value| value.into()),
                fsrs_profile_id: Option::<Guid>::from(file.fsrs_profile_choice())
                    .map(|id| id.into()),
            }
            .into_base64();

            let dto = SyncEntityDto {
                entity_id: file.id(),
                created_date: file.created_date(),
                entity_type: EntityType::File,
                data,
            };

            synced_entities.push(dto);
        }

        for cell in self
            .cell_repository
            .get_all_cells_modified_on_or_after(last_sync_date)
            .await?
        {
            let data = generated_code::Cell {
                modified_date: Some(cell.modified_date().into_timestamp()),
                index: cell.index(),
                content: cell.content().to_string(),
                file_id: cell.file_id().to_string(),
                cell_type: serde_json::to_string(&cell.cell_type()).unwrap(),
                searchable_content: cell.searchable_content().to_string(),
            }
            .into_base64();

            let dto = SyncEntityDto {
                entity_id: cell.id(),
                created_date: cell.created_date(),
                entity_type: EntityType::Cell,
                data,
            };

            synced_entities.push(dto);
        }

        for repetition in self
            .cell_repository
            .get_all_repetitions_modified_on_or_after(last_sync_date)
            .await?
        {
            let data = generated_code::Repetition {
                modified_date: Some(repetition.modified_date().into_timestamp()),
                file_id: repetition.file_id().to_string(),
                cell_id: repetition.cell_id().to_string(),
                due: Some(repetition.due().into_timestamp()),
                reps: repetition.reps(),
                stability: repetition.stability(),
                difficulty: repetition.difficulty(),
                elapsed_days: repetition.elapsed_days(),
                scheduled_days: repetition.scheduled_days(),
                lapses: repetition.lapses(),
                state: serde_json::to_string(&repetition.state()).unwrap(),
                last_review: repetition.last_review().map(|value| value.into_timestamp()),
                additional_content: repetition
                    .additional_content()
                    .map(|value| value.to_string()),
            }
            .into_base64();

            let dto = SyncEntityDto {
                entity_id: repetition.id(),
                created_date: repetition.created_date(),
                entity_type: EntityType::Repetition,
                data,
            };

            synced_entities.push(dto);
        }

        for review in self
            .review_repository
            .get_all_modified_on_or_after(last_sync_date)
            .await?
        {
            let data = generated_code::Review {
                modified_date: Some(review.modified_date().into_timestamp()),
                cell_id: review.cell_id().map(|value| value.to_string()),
                date: Some(review.date().into_timestamp()),
                rating: serde_json::to_string(&review.rating()).unwrap(),
                study_time: review.study_time(),
            }
            .into_base64();

            let dto = SyncEntityDto {
                entity_id: review.id(),
                created_date: review.created_date(),
                entity_type: EntityType::Review,
                data,
            };

            synced_entities.push(dto);
        }

        for deleted_entity in self
            .sync_repository
            .get_all_deleted_entities_on_or_after(last_sync_date)
            .await?
        {
            let data = generated_code::DeletedEntity {
                entity_name: deleted_entity.entity_name,
                deleted_date: Some(deleted_entity.entity_created_date.into_timestamp()),
            }
            .into_base64();

            let dto = SyncEntityDto {
                entity_id: deleted_entity.entity_id,
                created_date: deleted_entity.entity_created_date,
                entity_type: EntityType::DeletedEntity,
                data,
            };

            synced_entities.push(dto);
        }

        synced_entities.retain(|entity| !excluded_entities.contains(&entity.entity_id));

        if !synced_entities.is_empty() {
            #[cfg(debug_assertions)]
            log::info!("Sending these entities to sync:\n{:#?}", synced_entities);

            self.backend_client
                .send_synced_entities(&synced_entities)
                .await?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use chrono::Duration;

    use crate::{
        DEFAULT_FSRS_PROFILE_ID, ROOT_FOLDER_ID,
        backend::{
            models::SyncedEntitiesPageDto, traits::brainy_backend_client::MockBrainyBackendClient,
        },
        cells::entities::{cell::CellType, repetition::State, review::Rating},
        common::{
            extensions::{into_base64::IntoBase64, into_timestamp::IntoTimestamp},
            sqlite_repositories_context::SqliteRepositoriesContext,
            traits::repositories_context::RepositoriesContext,
        },
        file_system::value_objects::fsrs_profile_choice::FsrsProfileChoice,
    };

    use super::*;

    async fn create_test_dependencies() -> (SqliteRepositoriesContext, MockBrainyBackendClient) {
        let context = SqliteRepositoriesContext::create_testing_context().await;
        (context, MockBrainyBackendClient::new())
    }

    fn create_sync_service(
        context: &SqliteRepositoriesContext,
        backend_client: MockBrainyBackendClient,
    ) -> SyncService {
        let cell_service = CellService::new(context.cell_repository(), context.review_repository());
        SyncService::new(
            Arc::new(backend_client),
            context.folder_repository(),
            context.file_repository(),
            context.cell_repository(),
            context.review_repository(),
            context.sync_repository(),
            context.local_configuration_repository(),
            context.fsrs_repository(),
            Arc::new(cell_service),
        )
    }

    #[tokio::test]
    pub async fn sync_with_backend_new_entities_from_backend_inserted_new_entities() {
        // Arrange

        let (context, mut backend_client) = create_test_dependencies().await;
        let user_id = Guid::new_v4();
        let file_id = Guid::new_v4();
        let cell_id = Guid::new_v4();
        let fsrs_profile_id = Guid::new_v4();
        let file_modified_date = Utc::now() - Duration::hours(8);

        let synced_entities: Vec<SyncedEntity> = vec![
            SyncedEntity {
                user_id,
                entity_id: fsrs_profile_id,
                entity_type: EntityType::FsrsProfile,
                created_date: Utc::now(),
                last_sync_date: Utc::now(),
                data: generated_code::FsrsProfile {
                    modified_date: Some(Utc::now().into_timestamp()),
                    name: "test profile".into(),
                    request_retention: 10f64,
                    maximum_interval: 8f64,
                    weights: vec![1f64],
                }
                .into_base64(),
            },
            SyncedEntity {
                user_id,
                entity_id: Guid::new_v4(),
                entity_type: EntityType::Folder,
                created_date: Utc::now(),
                last_sync_date: Utc::now(),
                data: generated_code::Folder {
                    modified_date: Some(Utc::now().into_timestamp()),
                    name: "test".into(),
                    parent_id: Some(ROOT_FOLDER_ID.into()),
                    fsrs_profile_id: None,
                }
                .into_base64(),
            },
            SyncedEntity {
                user_id,
                entity_id: file_id,
                entity_type: EntityType::File,
                created_date: Utc::now(),
                last_sync_date: Utc::now(),
                data: generated_code::File {
                    modified_date: Some(file_modified_date.into_timestamp()),
                    name: "test".into(),
                    parent_id: Some(ROOT_FOLDER_ID.into()),
                    fsrs_profile_id: Some(fsrs_profile_id.to_string()),
                }
                .into_base64(),
            },
            SyncedEntity {
                user_id,
                entity_id: cell_id,
                entity_type: EntityType::Cell,
                created_date: Utc::now(),
                last_sync_date: Utc::now(),
                data: generated_code::Cell {
                    modified_date: Some(Utc::now().into_timestamp()),
                    content: "content".to_string(),
                    cell_type: serde_json::to_string(&CellType::FlashCard).unwrap(),
                    index: 1,
                    searchable_content: "search".to_string(),
                    file_id: file_id.to_string(),
                }
                .into_base64(),
            },
            SyncedEntity {
                user_id,
                entity_id: Guid::new_v4(),
                entity_type: EntityType::Repetition,
                created_date: Utc::now(),
                last_sync_date: Utc::now(),
                data: generated_code::Repetition {
                    modified_date: Some(Utc::now().into_timestamp()),
                    file_id: file_id.to_string(),
                    cell_id: cell_id.to_string(),
                    due: Some(Utc::now().into_timestamp()),
                    state: serde_json::to_string(&State::Learning).unwrap(),
                    ..Default::default()
                }
                .into_base64(),
            },
            SyncedEntity {
                user_id,
                entity_id: Guid::new_v4(),
                entity_type: EntityType::Review,
                created_date: Utc::now(),
                last_sync_date: Utc::now(),
                data: generated_code::Review {
                    modified_date: Some(Utc::now().into_timestamp()),
                    cell_id: Some(cell_id.to_string()),
                    date: Some(Utc::now().into_timestamp()),
                    rating: serde_json::to_string(&Rating::Hard).unwrap(),
                    ..Default::default()
                }
                .into_base64(),
            },
        ];

        backend_client
            .expect_get_synced_entities_after_ordered_by_created_date()
            .returning(move |_, _| {
                Ok(SyncedEntitiesPageDto {
                    synced_entities: synced_entities.clone(),
                    has_more: false,
                })
            });

        backend_client
            .expect_send_synced_entities()
            .returning(move |_| Ok(()));

        let service = create_sync_service(&context, backend_client);

        // Act

        service.sync_with_backend().await.unwrap();
        context.save_changes().await.unwrap();

        // Assert

        let fsrs_profiles = context
            .fsrs_repository()
            .get_all_fsrs_profiles()
            .await
            .unwrap();
        // Default & new profile.
        assert_eq!(2, fsrs_profiles.len());
        assert!(
            fsrs_profiles
                .iter()
                .any(|f| f.name() == "test profile" && f.request_retention() == 10f64)
        );

        let folders = context.folder_repository().get_all_folders().await.unwrap();
        assert_eq!(2, folders.len());
        assert!(folders.iter().any(|f| f.name()
            == FileSystemItemName::new_unchecked("test".to_string())
            && f.parent_id() == Some(ROOT_FOLDER_ID)
            && f.fsrs_profile_choice() == FsrsProfileChoice::Inherit));

        let files = context.file_repository().get_all_files().await.unwrap();
        assert_eq!(1, files.len());
        assert!(files.iter().any(|f| f.name()
            == FileSystemItemName::new_unchecked("test".to_string())
            && f.parent_id() == Some(ROOT_FOLDER_ID)
            && f.fsrs_profile_choice() == FsrsProfileChoice::Id(fsrs_profile_id)
            && (f.modified_date() - file_modified_date) <= Duration::seconds(1)));

        let cells = context
            .cell_repository()
            .get_file_cells_ordered_by_index(file_id)
            .await
            .unwrap();
        assert_eq!(1, cells.len());
        assert!(cells.iter().any(|c| c.file_id() == file_id
            && c.content() == "content"
            && c.cell_type() == &CellType::FlashCard
            && c.index() == 1
            && c.searchable_content() == "search"));
        assert_eq!(1, cells[0].repetitions().len());

        let home_statistics = context
            .cell_repository()
            .get_home_statistics()
            .await
            .unwrap();
        assert_eq!(1, home_statistics.number_of_reviews);
    }

    #[tokio::test]
    pub async fn sync_with_backend_two_cells_with_same_index_corrected_index_and_sent_update() {
        // Arrange

        let (context, mut backend_client) = create_test_dependencies().await;
        let cell_in_database_id = Guid::new_v4();
        let cell_from_sync_id = Guid::new_v4();

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        context.file_repository().create(&file).await.unwrap();
        context
            .cell_repository()
            .create(&Cell::new_unchecked(
                cell_in_database_id,
                Utc::now(),
                Utc::now(),
                file.id(),
                "".to_string(),
                CellType::Note,
                1,
                "".to_string(),
                Vec::new(),
            ))
            .await
            .unwrap();

        let synced_entities: Vec<SyncedEntity> = vec![SyncedEntity {
            user_id: Guid::new_v4(),
            entity_id: cell_from_sync_id,
            entity_type: EntityType::Cell,
            created_date: Utc::now(),
            last_sync_date: Utc::now(),
            data: generated_code::Cell {
                modified_date: Some(Utc::now().into_timestamp()),
                content: "content".to_string(),
                cell_type: serde_json::to_string(&CellType::FlashCard).unwrap(),
                index: 1,
                searchable_content: "search".to_string(),
                file_id: file.id().to_string(),
            }
            .into_base64(),
        }];

        backend_client
            .expect_get_synced_entities_after_ordered_by_created_date()
            .returning(move |_, _| {
                Ok(SyncedEntitiesPageDto {
                    synced_entities: synced_entities.clone(),
                    has_more: false,
                })
            });

        // Ensuring that the new index is sent!
        backend_client
            .expect_send_synced_entities()
            .withf(move |value| value.iter().any(|s| s.entity_id == cell_in_database_id))
            .returning(move |_| Ok(()));

        let service = create_sync_service(&context, backend_client);

        // Act

        service.sync_with_backend().await.unwrap();
        context.save_changes().await.unwrap();

        // Assert

        let cells = context
            .cell_repository()
            .get_file_cells_ordered_by_index(file.id())
            .await
            .unwrap();
        assert!(
            cells
                .iter()
                .any(|c| c.id() == cell_from_sync_id && c.index() == 1)
        );
        assert!(
            cells
                .iter()
                .any(|c| c.id() == cell_in_database_id && c.index() == 2)
        );
    }

    #[tokio::test]
    pub async fn sync_with_backend_deleted_entity_from_backend_processed_correctly() {
        // Arrange

        let (context, mut backend_client) = create_test_dependencies().await;
        let user_id = Guid::new_v4();
        let file_id = Guid::new_v4();
        context
            .file_repository()
            .create(&File::new_unchecked(
                file_id,
                Utc::now(),
                Utc::now(),
                Some(ROOT_FOLDER_ID),
                FileSystemItemName::new_unchecked("name".to_string()),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        let synced_entities: Vec<SyncedEntity> = vec![SyncedEntity {
            user_id,
            entity_id: file_id,
            entity_type: EntityType::DeletedEntity,
            created_date: Utc::now(),
            last_sync_date: Utc::now(),
            data: generated_code::DeletedEntity {
                entity_name: "files".to_string(),
                deleted_date: Some(Utc::now().into_timestamp()),
            }
            .into_base64(),
        }];

        backend_client
            .expect_get_synced_entities_after_ordered_by_created_date()
            .returning(move |_, _| {
                Ok(SyncedEntitiesPageDto {
                    synced_entities: synced_entities.clone(),
                    has_more: false,
                })
            });

        backend_client
            .expect_send_synced_entities()
            .returning(move |_| Ok(()));

        let service = create_sync_service(&context, backend_client);

        // Act

        service.sync_with_backend().await.unwrap();
        context.save_changes().await.unwrap();

        // Assert

        let files = context.file_repository().get_all_files().await.unwrap();
        assert_eq!(0, files.len());
    }

    #[tokio::test]
    pub async fn sync_with_backend_existing_entity_with_older_modified_date_locally_entity_updated()
    {
        // Arrange

        let (context, mut backend_client) = create_test_dependencies().await;
        let user_id = Guid::new_v4();

        let file_id = Guid::new_v4();
        let cell_id = Guid::new_v4();

        context
            .file_repository()
            .create(&File::new_unchecked(
                file_id,
                Utc::now(),
                Utc::now(),
                Some(ROOT_FOLDER_ID),
                FileSystemItemName::new_unchecked("old name".to_string()),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();

        context
            .cell_repository()
            .create(&Cell::new_unchecked(
                cell_id,
                Utc::now(),
                Utc::now(),
                file_id,
                "old content".to_string(),
                CellType::FlashCard,
                1,
                "".to_string(),
                Vec::new(),
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        let synced_entities: Vec<SyncedEntity> = vec![
            SyncedEntity {
                user_id,
                entity_id: file_id,
                entity_type: EntityType::File,
                created_date: Utc::now(),
                last_sync_date: Utc::now(),
                data: generated_code::File {
                    modified_date: Some(Utc::now().into_timestamp()),
                    name: "new name".into(),
                    parent_id: Some(ROOT_FOLDER_ID.into()),
                    fsrs_profile_id: None,
                }
                .into_base64(),
            },
            SyncedEntity {
                user_id,
                entity_id: cell_id,
                entity_type: EntityType::Cell,
                created_date: Utc::now(),
                last_sync_date: Utc::now(),
                data: generated_code::Cell {
                    modified_date: Some(Utc::now().into_timestamp()),
                    content: "new content".to_string(),
                    cell_type: serde_json::to_string(&CellType::FlashCard).unwrap(),
                    file_id: file_id.to_string(),
                    ..Default::default()
                }
                .into_base64(),
            },
            SyncedEntity {
                user_id,
                entity_id: DEFAULT_FSRS_PROFILE_ID,
                entity_type: EntityType::FsrsProfile,
                created_date: Utc::now(),
                last_sync_date: Utc::now(),
                data: generated_code::FsrsProfile {
                    modified_date: Some(Utc::now().into_timestamp()),
                    name: "new name".into(),
                    request_retention: 10f64,
                    maximum_interval: 8f64,
                    weights: vec![1f64],
                }
                .into_base64(),
            },
        ];

        backend_client
            .expect_get_synced_entities_after_ordered_by_created_date()
            .returning(move |_, _| {
                Ok(SyncedEntitiesPageDto {
                    synced_entities: synced_entities.clone(),
                    has_more: false,
                })
            });

        backend_client
            .expect_send_synced_entities()
            .returning(move |_| Ok(()));

        let service = create_sync_service(&context, backend_client);

        // Act

        service.sync_with_backend().await.unwrap();
        context.save_changes().await.unwrap();

        // Assert

        let files = context.file_repository().get_all_files().await.unwrap();
        assert_eq!(1, files.len());
        assert!(
            files
                .iter()
                .any(|f| f.name() == FileSystemItemName::new_unchecked("new name".to_string()))
        );

        let cells = context
            .cell_repository()
            .get_file_cells_ordered_by_index(file_id)
            .await
            .unwrap();
        assert_eq!(1, cells.len());
        assert!(cells.iter().any(|c| c.content() == "new content"));

        let fsrs_profiles = context
            .fsrs_repository()
            .get_all_fsrs_profiles()
            .await
            .unwrap();
        assert_eq!(1, fsrs_profiles.len());
        assert!(fsrs_profiles.iter().any(|c| c.name() == "new name"));
    }

    #[tokio::test]
    pub async fn sync_with_backend_existing_entity_with_newer_modified_date_locally_entities_not_updated()
     {
        // Arrange

        let (context, mut backend_client) = create_test_dependencies().await;
        let user_id = Guid::new_v4();

        let file_id = Guid::new_v4();
        let cell_id = Guid::new_v4();

        let synced_entities: Vec<SyncedEntity> = vec![
            SyncedEntity {
                user_id,
                entity_id: file_id,
                entity_type: EntityType::File,
                created_date: Utc::now(),
                last_sync_date: Utc::now(),
                data: generated_code::File {
                    modified_date: Some(Utc::now().into_timestamp()),
                    name: "new name".into(),
                    parent_id: Some(ROOT_FOLDER_ID.into()),
                    fsrs_profile_id: None,
                }
                .into_base64(),
            },
            SyncedEntity {
                user_id,
                entity_id: cell_id,
                entity_type: EntityType::Cell,
                created_date: Utc::now(),
                last_sync_date: Utc::now(),
                data: generated_code::Cell {
                    modified_date: Some(Utc::now().into_timestamp()),
                    content: "new content".to_string(),
                    cell_type: serde_json::to_string(&CellType::FlashCard).unwrap(),
                    file_id: file_id.to_string(),
                    ..Default::default()
                }
                .into_base64(),
            },
        ];

        context
            .file_repository()
            .create(&File::new_unchecked(
                file_id,
                Utc::now(),
                Utc::now(),
                Some(ROOT_FOLDER_ID),
                FileSystemItemName::new_unchecked("old name".to_string()),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();

        context
            .cell_repository()
            .create(&Cell::new_unchecked(
                cell_id,
                Utc::now(),
                Utc::now(),
                file_id,
                "old content".to_string(),
                CellType::FlashCard,
                1,
                "".to_string(),
                Vec::new(),
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        backend_client
            .expect_get_synced_entities_after_ordered_by_created_date()
            .returning(move |_, _| {
                Ok(SyncedEntitiesPageDto {
                    synced_entities: synced_entities.clone(),
                    has_more: false,
                })
            });

        backend_client
            .expect_send_synced_entities()
            .returning(move |_| Ok(()));

        let service = create_sync_service(&context, backend_client);

        // Act

        service.sync_with_backend().await.unwrap();
        context.save_changes().await.unwrap();

        // Assert

        let files = context.file_repository().get_all_files().await.unwrap();
        assert_eq!(1, files.len());
        assert!(
            files
                .iter()
                .any(|f| f.name() == FileSystemItemName::new_unchecked("new name".to_string()))
        );

        let cells = context
            .cell_repository()
            .get_file_cells_ordered_by_index(file_id)
            .await
            .unwrap();
        assert_eq!(1, cells.len());
        assert!(cells.iter().any(|c| c.content() == "new content"));
    }

    #[tokio::test]
    pub async fn sync_with_backend_valid_input_updated_sync_date_at_end() {
        // Arrange

        let (context, mut backend_client) = create_test_dependencies().await;

        backend_client
            .expect_get_synced_entities_after_ordered_by_created_date()
            .returning(move |_, _| {
                Ok(SyncedEntitiesPageDto {
                    synced_entities: Vec::new(),
                    has_more: false,
                })
            });

        backend_client
            .expect_send_synced_entities()
            .returning(move |_| Ok(()));

        let service = create_sync_service(&context, backend_client);

        // Act

        service.sync_with_backend().await.unwrap();
        context.save_changes().await.unwrap();

        // Assert

        let actual_sync_date_configuration = context
            .local_configuration_repository()
            .get_by_name(LAST_SYNC_DATE_CONFIGURATION_NAME)
            .await
            .unwrap()
            .unwrap();
        let actual_date = DateTime::parse_from_rfc3339(&actual_sync_date_configuration.value)
            .unwrap()
            .with_timezone(&Utc);

        assert!((Utc::now() - actual_date) <= Duration::seconds(5));
    }

    #[tokio::test]
    pub async fn sync_with_backend_local_unsynced_file_sent_file() {
        // Arrange

        let (context, mut backend_client) = create_test_dependencies().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            FileSystemItemName::new_unchecked("name".to_string()),
            FsrsProfileChoice::Inherit,
        );
        context.file_repository().create(&file).await.unwrap();
        context.save_changes().await.unwrap();

        backend_client
            .expect_get_synced_entities_after_ordered_by_created_date()
            .returning(move |_, _| {
                Ok(SyncedEntitiesPageDto {
                    synced_entities: Vec::new(),
                    has_more: false,
                })
            });

        backend_client
            .expect_send_synced_entities()
            // The count should be 2 due to the root folder and default FSRS profile.
            .withf(move |value| value.len() == 3)
            .returning(move |_| Ok(()));

        let service = create_sync_service(&context, backend_client);

        // Act & Assert

        service.sync_with_backend().await.unwrap();
    }

    #[tokio::test]
    pub async fn sync_with_backend_local_file_already_synced_did_not_send_file() {
        // Arrange

        let (context, mut backend_client) = create_test_dependencies().await;

        context
            .local_configuration_repository()
            .upsert(&LocalConfiguration {
                name: LAST_SYNC_DATE_CONFIGURATION_NAME.to_string(),
                value: Utc::now().to_rfc3339(),
            })
            .await
            .unwrap();

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now() - Duration::seconds(10),
            Some(ROOT_FOLDER_ID),
            FileSystemItemName::new_unchecked("name".to_string()),
            FsrsProfileChoice::Inherit,
        );
        context.file_repository().create(&file).await.unwrap();
        context.save_changes().await.unwrap();

        backend_client
            .expect_get_synced_entities_after_ordered_by_created_date()
            .returning(move |_, _| {
                Ok(SyncedEntitiesPageDto {
                    synced_entities: Vec::new(),
                    has_more: false,
                })
            });

        backend_client
            .expect_send_synced_entities()
            // The count should be 2 due to the root folder and default FSRS profile.
            .withf(move |value| value.len() == 2)
            .returning(move |_| Ok(()));

        let service = create_sync_service(&context, backend_client);

        // Act & Assert

        service.sync_with_backend().await.unwrap();
    }

    #[tokio::test]
    pub async fn sync_with_backend_overwritten_change_from_backend_did_not_send_change() {
        // Arrange

        let (context, mut backend_client) = create_test_dependencies().await;
        let folder_id = Guid::new_v4();

        context
            .folder_repository()
            .create(&Folder::new_unchecked(
                folder_id,
                Utc::now(),
                Utc::now(),
                None,
                FileSystemItemName::new_unchecked("test".to_string()),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();

        let synced_entities: Vec<SyncedEntity> = vec![SyncedEntity {
            user_id: Guid::new_v4(),
            entity_id: folder_id,
            entity_type: EntityType::Folder,
            created_date: Utc::now(),
            last_sync_date: Utc::now(),
            data: generated_code::Folder {
                modified_date: Some(Utc::now().into_timestamp()),
                name: "test".into(),
                parent_id: Some(ROOT_FOLDER_ID.into()),
                fsrs_profile_id: None,
            }
            .into_base64(),
        }];

        backend_client
            .expect_get_synced_entities_after_ordered_by_created_date()
            .returning(move |_, _| {
                Ok(SyncedEntitiesPageDto {
                    synced_entities: synced_entities.clone(),
                    has_more: false,
                })
            });

        backend_client
            .expect_send_synced_entities()
            // The count should be 2 due to the root folder, and FSRS profile, the created folder should not be sent.
            .withf(move |value| value.len() == 2)
            .returning(move |_| Ok(()));

        let service = create_sync_service(&context, backend_client);

        // Act & Assert

        service.sync_with_backend().await.unwrap();
        context.save_changes().await.unwrap();
    }
}
