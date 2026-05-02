use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    file_system::{
        repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
        services::item_mover::{FileMover, FileMoverError, FolderMover, FolderMoverError},
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultItemMover {
    folder_repository: Arc<dyn FolderRepository>,
    file_repository: Arc<dyn FileRepository>,
}

impl DefaultItemMover {
    async fn is_subfolder_of(
        &self,
        parent_folder_id: Guid,
        child_folder_id: Guid,
    ) -> Result<bool, FolderMoverError> {
        let mut curr_parent_id = Some(child_folder_id);

        while curr_parent_id != Some(parent_folder_id) && curr_parent_id.is_some() {
            let curr_folder = self
                .folder_repository
                .get_by_id(curr_parent_id.unwrap())
                .await?;
            curr_parent_id = curr_folder.parent_id();
        }

        Ok(curr_parent_id == Some(parent_folder_id))
    }
}

#[async_trait]
impl FolderMover for DefaultItemMover {
    async fn move_folder(
        &self,
        folder_id: Guid,
        destination_folder_id: Option<Guid>,
    ) -> Result<(), FolderMoverError> {
        log::info!(
            "Moving folder with id {folder_id} into folder with id {destination_folder_id:?}"
        );

        let mut folder = self.folder_repository.get_by_id(folder_id).await?;

        if Some(folder_id) == destination_folder_id || folder.parent_id() == destination_folder_id {
            log::info!("Skip moving the folder into the same folder!");
            return Ok(());
        }

        if self
            .folder_repository
            .exists(destination_folder_id, &folder.name())
            .await?
        {
            return Err(FolderMoverError::FolderExists {
                name: folder.name().to_string(),
            });
        }

        if let Some(destination_folder_id) = destination_folder_id
            && self
                .is_subfolder_of(folder_id, destination_folder_id)
                .await?
        {
            return Err(FolderMoverError::CannotMoveChildIntoInnerFolder);
        }

        folder.set_parent_id(destination_folder_id);
        self.folder_repository.update(&folder).await?;
        log::info!(
            "Moved folder with name {}, and id {:?} from folder with id {:?} to folder with id {:?}",
            folder.name(),
            folder_id,
            folder.parent_id(),
            destination_folder_id
        );
        Ok(())
    }
}

#[async_trait]
impl FileMover for DefaultItemMover {
    async fn move_file(
        &self,
        file_id: Guid,
        destination_folder_id: Option<Guid>,
    ) -> Result<(), FileMoverError> {
        log::info!("Moving file with id {file_id} into folder with id {destination_folder_id:?}");

        let mut file = self.file_repository.get_by_id(file_id).await?;

        if file.parent_id() == destination_folder_id {
            log::info!("Skip moving the file into the same folder!");
            return Ok(());
        }

        if self
            .file_repository
            .exists(destination_folder_id, &file.name())
            .await?
        {
            return Err(FileMoverError::FileExists {
                name: file.name().to_string(),
            });
        }

        file.set_parent_id(destination_folder_id);
        self.file_repository.update(&file).await?;
        log::info!(
            "Moved file with name {}, and id {:?} from folder with id {:?} to folder with id {:?}",
            file.name(),
            file_id,
            file.parent_id(),
            destination_folder_id
        );
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
            services::item_mover::{FileMover, FileMoverError, FolderMover, FolderMoverError},
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
        register_scope!(injector, DefaultItemMover);
        injector
    }

    #[tokio::test]
    pub async fn move_folder_to_nested_folder_error_returned() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemMover>().await;

        let parent_folder_id = Guid::new_v4();
        let child_folder_id = Guid::new_v4();

        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(parent_folder_id),
                Some(ROOT_FOLDER_ID),
                "parent folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(child_folder_id),
                Some(parent_folder_id),
                "nested folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .move_folder(parent_folder_id, Some(child_folder_id))
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            Err(FolderMoverError::CannotMoveChildIntoInnerFolder),
            actual
        );
    }

    #[tokio::test]
    pub async fn move_folder_two_level_down_nested_folder_error_returned() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemMover>().await;

        let parent_folder_id = Guid::new_v4();
        let child_folder_id1 = Guid::new_v4();
        let child_folder_id2 = Guid::new_v4();

        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(parent_folder_id),
                Some(ROOT_FOLDER_ID),
                "parent folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(child_folder_id1),
                Some(parent_folder_id),
                "nested folder 1".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(child_folder_id2),
                Some(child_folder_id1),
                "nested folder 2".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .move_folder(parent_folder_id, Some(child_folder_id2))
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            Err(FolderMoverError::CannotMoveChildIntoInnerFolder),
            actual
        );
    }

    #[tokio::test]
    pub async fn move_folder_existing_folder_error_returned() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemMover>().await;

        let parent_folder_id = Guid::new_v4();
        let child_folder_id1 = Guid::new_v4();
        let child_folder_id2 = Guid::new_v4();

        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(parent_folder_id),
                Some(ROOT_FOLDER_ID),
                "parent folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(child_folder_id1),
                Some(parent_folder_id),
                "child folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(child_folder_id2),
                Some(ROOT_FOLDER_ID),
                "child folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .move_folder(child_folder_id2, Some(parent_folder_id))
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            Err(FolderMoverError::FolderExists {
                name: "child folder".to_string()
            }),
            actual
        );
    }

    #[tokio::test]
    pub async fn move_folder_valid_input_moved_folder() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemMover>().await;

        let parent_folder_id1 = Guid::new_v4();
        let parent_folder_id2 = Guid::new_v4();
        let child_folder_id = Guid::new_v4();

        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(parent_folder_id1),
                Some(ROOT_FOLDER_ID),
                "parent folder 1".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(parent_folder_id2),
                Some(ROOT_FOLDER_ID),
                "parent folder 2".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(child_folder_id),
                Some(parent_folder_id1),
                "child folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .move_folder(child_folder_id, Some(parent_folder_id2))
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(Ok(()), actual);
        let folder = scope
            .resolve::<dyn FolderRepository>()
            .await
            .get_by_id(child_folder_id)
            .await
            .unwrap();
        assert_eq!(Some(parent_folder_id2), folder.parent_id());
    }

    #[tokio::test]
    pub async fn move_file_existing_file_error_returned() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemMover>().await;

        let parent_folder_id = Guid::new_v4();
        let child_file_id1 = Guid::new_v4();
        let child_file_id2 = Guid::new_v4();

        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(parent_folder_id),
                Some(ROOT_FOLDER_ID),
                "parent folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FileRepository>()
            .await
            .create(&File::new(
                Some(child_file_id1),
                Some(parent_folder_id),
                "child file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FileRepository>()
            .await
            .create(&File::new(
                Some(child_file_id2),
                Some(ROOT_FOLDER_ID),
                "child file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .move_file(child_file_id2, Some(parent_folder_id))
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            Err(FileMoverError::FileExists {
                name: "child file".to_string()
            }),
            actual
        );
    }

    #[tokio::test]
    pub async fn move_file_valid_input_moved_file() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemMover>().await;

        let parent_folder_id1 = Guid::new_v4();
        let parent_folder_id2 = Guid::new_v4();
        let child_file_id = Guid::new_v4();

        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(parent_folder_id1),
                Some(ROOT_FOLDER_ID),
                "parent folder 1".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(&Folder::new(
                Some(parent_folder_id2),
                Some(ROOT_FOLDER_ID),
                "parent folder 2".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FileRepository>()
            .await
            .create(&File::new(
                Some(child_file_id),
                Some(parent_folder_id1),
                "child file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .move_file(child_file_id, Some(parent_folder_id2))
            .await;
        scope.save_changes().await.unwrap();

        // Assert

        assert_eq!(Ok(()), actual);
        let file = scope
            .resolve::<dyn FileRepository>()
            .await
            .get_by_id(child_file_id)
            .await
            .unwrap();
        assert_eq!(Some(parent_folder_id2), file.parent_id());
    }
}
