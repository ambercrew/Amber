use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    file_system::{
        repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
        services::item_renamer::{
            FileRenamer, FileRenamerError, FolderRenamer, FolderRenamerError,
        },
        value_objects::file_system_item_name::FileSystemItemName,
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultItemRenamer {
    folder_repository: Arc<dyn FolderRepository>,
    file_repository: Arc<dyn FileRepository>,
}

#[async_trait]
impl FolderRenamer for DefaultItemRenamer {
    async fn rename_folder(
        &self,
        folder_id: Guid,
        new_name: FileSystemItemName,
    ) -> Result<(), FolderRenamerError> {
        log::info!("Renaming folder with id {folder_id} into name {new_name}");

        let mut folder = self.folder_repository.get_by_id(folder_id).await?;

        if folder.name() == new_name {
            log::info!("Skip renaming since the name is the same!");
            return Ok(());
        }

        if self
            .folder_repository
            .exists(folder.parent_id(), &new_name)
            .await?
        {
            return Err(FolderRenamerError::FolderExists {
                name: new_name.to_string(),
            });
        }

        folder.set_name(new_name.clone());
        self.folder_repository.update(&folder).await?;
        log::info!("Renamed folder with id {folder_id} to {new_name}");
        Ok(())
    }
}

#[async_trait]
impl FileRenamer for DefaultItemRenamer {
    async fn rename_file(
        &self,
        file_id: Guid,
        new_name: FileSystemItemName,
    ) -> Result<(), FileRenamerError> {
        log::info!("Renaming file with id {file_id} into name {new_name}");

        let mut file = self.file_repository.get_by_id(file_id).await?;

        if file.name() == new_name {
            log::info!("Skip renaming since the name is the same!");
            return Ok(());
        }

        if self
            .file_repository
            .exists(file.parent_id(), &new_name)
            .await?
        {
            return Err(FileRenamerError::FileExists {
                name: new_name.to_string(),
            });
        }

        file.set_name(new_name.clone());
        self.file_repository.update(&file).await?;
        log::info!("Renamed file with id {file_id} to {new_name}");
        Ok(())
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
            services::item_renamer::{
                FileRenamer, FileRenamerError, FolderRenamer, FolderRenamerError,
            },
            value_objects::{
                file_system_item_name::FileSystemItemName, fsrs_profile_choice::FsrsProfileChoice,
            },
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
        register_scope!(injector, DefaultItemRenamer);
        injector
    }

    #[tokio::test]
    pub async fn rename_folder_existing_folder_returned_error() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemRenamer>().await;

        let folder_id = Guid::new_v4();

        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(folder_id),
                Some(ROOT_FOLDER_ID),
                "folder 1".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                None,
                Some(ROOT_FOLDER_ID),
                "folder 2".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .rename_folder(folder_id, "folder 2".try_into().unwrap())
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            FolderRenamerError::FolderExists {
                name: "folder 2".into()
            },
            actual.unwrap_err()
        );
    }

    #[tokio::test]
    pub async fn rename_folder_same_name_folder_not_changed() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemRenamer>().await;

        let folder_id = Guid::new_v4();

        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(folder_id),
                Some(ROOT_FOLDER_ID),
                "folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .rename_folder(folder_id, "folder".try_into().unwrap())
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(Ok(()), actual);
        let folder = scope
            .resolve::<dyn FolderRepository>()
            .await
            .get_by_id(folder_id)
            .await
            .unwrap();
        assert_eq!(
            FileSystemItemName::new_unchecked("folder".to_string()),
            folder.name()
        );
    }

    #[tokio::test]
    pub async fn rename_folder_valid_input_renamed_folder() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemRenamer>().await;

        let folder_id = Guid::new_v4();

        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(folder_id),
                Some(ROOT_FOLDER_ID),
                "folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .rename_folder(folder_id, "folder 2".try_into().unwrap())
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(Ok(()), actual);
        let folder = scope
            .resolve::<dyn FolderRepository>()
            .await
            .get_by_id(folder_id)
            .await
            .unwrap();
        assert_eq!(
            FileSystemItemName::new_unchecked("folder 2".to_string()),
            folder.name()
        );
    }

    #[tokio::test]
    pub async fn rename_file_existing_file_returned_error() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemRenamer>().await;

        let file_id = Guid::new_v4();

        scope
            .resolve::<dyn FileRepository>()
            .await
            .create(&File::new(
                Some(file_id),
                Some(ROOT_FOLDER_ID),
                "file 1".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FileRepository>()
            .await
            .create(&File::new(
                None,
                Some(ROOT_FOLDER_ID),
                "file 2".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .rename_file(file_id, "file 2".try_into().unwrap())
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            FileRenamerError::FileExists {
                name: "file 2".into()
            },
            actual.unwrap_err()
        );
    }

    #[tokio::test]
    pub async fn rename_file_same_name_file_not_changed() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemRenamer>().await;

        let file_id = Guid::new_v4();

        scope
            .resolve::<dyn FileRepository>()
            .await
            .create(&File::new(
                Some(file_id),
                Some(ROOT_FOLDER_ID),
                "file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .rename_file(file_id, "file".try_into().unwrap())
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(Ok(()), actual);
        let file = scope
            .resolve::<dyn FileRepository>()
            .await
            .get_by_id(file_id)
            .await
            .unwrap();
        assert_eq!(
            FileSystemItemName::new_unchecked("file".to_string()),
            file.name()
        );
    }

    #[tokio::test]
    pub async fn rename_file_valid_input_renamed_file() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemRenamer>().await;

        let file_id = Guid::new_v4();

        scope
            .resolve::<dyn FileRepository>()
            .await
            .create(&File::new(
                Some(file_id),
                Some(ROOT_FOLDER_ID),
                "file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .rename_file(file_id, "file 2".try_into().unwrap())
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(Ok(()), actual);
        let file = scope
            .resolve::<dyn FileRepository>()
            .await
            .get_by_id(file_id)
            .await
            .unwrap();
        assert_eq!(
            FileSystemItemName::new_unchecked("file 2".to_string()),
            file.name()
        );
    }
}
