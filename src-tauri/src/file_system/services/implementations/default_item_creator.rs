use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    file_system::{
        entities::{file::File, folder::Folder},
        repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
        services::item_creator::{
            FileCreator, FileCreatorError, FolderCreator, FolderCreatorError,
        },
        value_objects::{
            file_system_item_name::FileSystemItemName, fsrs_profile_choice::FsrsProfileChoice,
        },
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultItemCreator {
    folder_repository: Arc<dyn FolderRepository>,
    file_repository: Arc<dyn FileRepository>,
}

#[async_trait]
impl FolderCreator for DefaultItemCreator {
    async fn create_folder(
        &self,
        parent_id: Option<Guid>,
        name: FileSystemItemName,
    ) -> Result<Guid, FolderCreatorError> {
        log::info!("Creating folder with name {name} and inside parent folder {parent_id:?}");

        if self.folder_repository.exists(parent_id, &name).await? {
            return Err(FolderCreatorError::FolderExists {
                name: name.to_string(),
            });
        }

        let folder = Folder::new(None, parent_id, name, FsrsProfileChoice::Inherit);
        self.folder_repository.create(&folder).await?;

        log::info!("Created folder with id {}", folder.id());
        Ok(folder.id())
    }
}

#[async_trait]
impl FileCreator for DefaultItemCreator {
    async fn create_file(
        &self,
        parent_id: Option<Guid>,
        name: FileSystemItemName,
    ) -> Result<Guid, FileCreatorError> {
        log::info!("Creating file with name {name} and inside parent folder {parent_id:?}");

        if self.file_repository.exists(parent_id, &name).await? {
            return Err(FileCreatorError::FileExists {
                name: name.to_string(),
            });
        }

        let file = File::new(None, parent_id, name, FsrsProfileChoice::Inherit);
        self.file_repository.create(&file).await?;
        log::info!("Created file with id {}", file.id());

        Ok(file.id())
    }
}

#[cfg(test)]
pub mod tests {
    use injector::{injector::Injector, register_scope};

    use super::*;
    use crate::{
        Guid, ROOT_FOLDER_ID,
        file_system::{
            entities::{file::File, folder::Folder},
            repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
            services::item_creator::{
                FileCreator, FileCreatorError, FolderCreator, FolderCreatorError,
            },
            value_objects::fsrs_profile_choice::FsrsProfileChoice,
        },
        infrastructure::{
            extensions::unit_of_work::UnitOfWorkExt,
            repositories::sqlite::{
                sqlite_file_repository::SqliteFileRepository,
                sqlite_folder_repository::SqliteFolderRepository,
            },
        },
        test_utils::create_test_injector,
    };

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        register_scope!(injector, DefaultItemCreator);
        injector
    }

    #[tokio::test]
    pub async fn create_folder_existing_folder_returned_error() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemCreator>().await;

        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                None,
                Some(ROOT_FOLDER_ID),
                "folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .create_folder(Some(ROOT_FOLDER_ID), "folder".try_into().unwrap())
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            FolderCreatorError::FolderExists {
                name: "folder".into()
            },
            actual.unwrap_err()
        );
    }

    #[tokio::test]
    pub async fn create_folder_valid_input_created_folder() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemCreator>().await;

        // Act

        let actual = service
            .create_folder(Some(ROOT_FOLDER_ID), "folder".try_into().unwrap())
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_ne!(Guid::nil(), actual.unwrap());
    }

    #[tokio::test]
    pub async fn create_file_existing_file_returned_error() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemCreator>().await;

        scope
            .resolve::<dyn FileRepository>()
            .await
            .create(&File::new(
                None,
                Some(ROOT_FOLDER_ID),
                "file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .create_file(Some(ROOT_FOLDER_ID), "file".try_into().unwrap())
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            FileCreatorError::FileExists {
                name: "file".into()
            },
            actual.unwrap_err()
        );
    }
}
