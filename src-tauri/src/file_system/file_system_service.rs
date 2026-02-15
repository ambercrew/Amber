use std::sync::Arc;

use lol_html::html_content::Element;
use lol_html::{RewriteStrSettings, element, rewrite_str};
use thiserror::Error;

use crate::file_system::value_objects::fsrs_profile_choice::FsrsProfileChoice;
use crate::{
    Guid,
    cells::{
        cell_service::{CellService, CellServiceError},
        repositories::traits::cell_repository::CellRepository,
    },
    common::repository_error::RepositoryError,
    file_system::{
        entities::{file::File, folder::Folder},
        models::exported_item::{ExportedItem, ExportedItemType},
        repositories::traits::{
            file_repository::FileRepository, folder_repository::FolderRepository,
        },
        value_objects::file_system_item_name::FileSystemItemName,
    },
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum FileServiceError {
    #[error("The file with the name '{name}' already exists!")]
    FileExists { name: String },
    #[error("The folder with the name '{name}' already exists!")]
    FolderExists { name: String },
    #[error("Cannot move folder to a nested folder within the current folder")]
    CannotMoveChildIntoInnerFolder,
    #[error("{0}")]
    CellServiceError(#[from] CellServiceError),
    #[error("{0}")]
    UnknownRepositoryError(#[from] RepositoryError),
}

pub struct FileSystemService {
    cell_service: Arc<CellService>,
    folder_repository: Arc<dyn FolderRepository>,
    file_repository: Arc<dyn FileRepository>,
    cell_repository: Arc<dyn CellRepository>,
}

impl FileSystemService {
    pub fn new(
        cell_service: Arc<CellService>,
        folder_repository: Arc<dyn FolderRepository>,
        file_repository: Arc<dyn FileRepository>,
        cell_repository: Arc<dyn CellRepository>,
    ) -> Self {
        Self {
            cell_service,
            folder_repository,
            file_repository,
            cell_repository,
        }
    }

    pub async fn create_folder(
        &self,
        parent_id: Option<Guid>,
        name: FileSystemItemName,
    ) -> Result<Guid, FileServiceError> {
        log::info!("Creating folder with name {name} and inside parent folder {parent_id:?}");

        if self.folder_repository.exists(parent_id, &name).await? {
            return Err(FileServiceError::FolderExists {
                name: name.to_string(),
            });
        }

        let folder = Folder::new(None, parent_id, name, FsrsProfileChoice::Inherit);
        self.folder_repository.create(&folder).await?;

        log::info!("Created folder with id {}", folder.id());
        Ok(folder.id())
    }

    pub async fn rename_folder(
        &self,
        folder_id: Guid,
        new_name: FileSystemItemName,
    ) -> Result<(), FileServiceError> {
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
            return Err(FileServiceError::FolderExists {
                name: new_name.to_string(),
            });
        }

        folder.set_name(new_name.clone());
        self.folder_repository.update(&folder).await?;
        log::info!("Renamed folder with id {folder_id} to {new_name}");
        Ok(())
    }

    pub async fn move_folder(
        &self,
        folder_id: Guid,
        destination_folder_id: Option<Guid>,
    ) -> Result<(), FileServiceError> {
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
            return Err(FileServiceError::FolderExists {
                name: folder.name().to_string(),
            });
        }

        if let Some(destination_folder_id) = destination_folder_id
            && self
                .is_subfolder_of(folder_id, destination_folder_id)
                .await?
        {
            return Err(FileServiceError::CannotMoveChildIntoInnerFolder);
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

    /// Checks whether the child folder is inside the parent folder.
    async fn is_subfolder_of(
        &self,
        parent_folder_id: Guid,
        child_folder_id: Guid,
    ) -> Result<bool, FileServiceError> {
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

    pub async fn create_file(
        &self,
        parent_id: Option<Guid>,
        name: FileSystemItemName,
    ) -> Result<Guid, FileServiceError> {
        log::info!("Creating file with name {name} and inside parent folder {parent_id:?}");

        if self.file_repository.exists(parent_id, &name).await? {
            return Err(FileServiceError::FileExists {
                name: name.to_string(),
            });
        }

        let file = File::new(None, parent_id, name, FsrsProfileChoice::Inherit);
        self.file_repository.create(&file).await?;
        log::info!("Created file with id {}", file.id());

        Ok(file.id())
    }

    pub async fn rename_file(
        &self,
        file_id: Guid,
        new_name: FileSystemItemName,
    ) -> Result<(), FileServiceError> {
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
            return Err(FileServiceError::FileExists {
                name: new_name.to_string(),
            });
        }

        file.set_name(new_name.clone());
        self.file_repository.update(&file).await?;
        log::info!("Renamed file with id {file_id} to {new_name}");
        Ok(())
    }

    pub async fn move_file(
        &self,
        file_id: Guid,
        destination_folder_id: Option<Guid>,
    ) -> Result<(), FileServiceError> {
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
            return Err(FileServiceError::FileExists {
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

    pub async fn convert_folder_to_exported_item(
        &self,
        folder_id: Guid,
    ) -> Result<ExportedItem, FileServiceError> {
        log::info!("Exporting folder with id {folder_id}.");

        let folder = self.folder_repository.get_by_id(folder_id).await?;
        let mut children = Vec::new();

        let subfolders = self.folder_repository.get_subfolders(folder_id).await?;
        for subfolder in subfolders {
            let subfolder_exported_item =
                Box::pin(self.convert_folder_to_exported_item(subfolder.id())).await?;
            children.push(subfolder_exported_item);
        }

        let files = self.file_repository.get_folder_files(folder_id).await?;
        for file in files {
            let file_exported_item = self.convert_file_to_exported_item(file.id()).await?;
            children.push(file_exported_item);
        }

        Ok(ExportedItem {
            name: folder.name(),
            item_type: ExportedItemType::Folder,
            cells: None,
            children: Some(children),
        })
    }

    pub async fn convert_file_to_exported_item(
        &self,
        file_id: Guid,
    ) -> Result<ExportedItem, FileServiceError> {
        log::info!("Exporting file with id {file_id}.");

        let file = self.file_repository.get_by_id(file_id).await?;
        let cells = self
            .cell_repository
            .get_file_cells_ordered_by_index(file_id)
            .await?;
        let exported_cells = cells.into_iter().map(|c| c.into()).collect();

        Ok(ExportedItem {
            name: file.name(),
            item_type: ExportedItemType::File,
            cells: Some(exported_cells),
            children: None,
        })
    }

    pub async fn import_exported_item(
        &self,
        import_into_folder_id: Guid,
        exported_item: ExportedItem,
    ) -> Result<(), FileServiceError> {
        match exported_item.item_type {
            ExportedItemType::File => {
                log::info!("Importing file with name {}.", exported_item.name);

                let file_id = self
                    .create_file(Some(import_into_folder_id), exported_item.name)
                    .await?;

                for (i, cell) in exported_item
                    .cells
                    .unwrap_or_default()
                    .into_iter()
                    .enumerate()
                {
                    let purified_html = purify_html(&cell.content);
                    self.cell_service
                        .create_cell(file_id, purified_html, cell.cell_type, i as u32)
                        .await?;
                }
            }
            ExportedItemType::Folder => {
                log::info!("Importing folder with name {}.", exported_item.name);

                let folder_id = self
                    .create_folder(Some(import_into_folder_id), exported_item.name)
                    .await?;

                for child in exported_item.children.unwrap_or_default() {
                    Box::pin(self.import_exported_item(folder_id, child)).await?;
                }
            }
        }

        Ok(())
    }
}

fn purify_html(html: &str) -> String {
    let handler = |el: &mut Element| {
        if el.tag_name().to_lowercase() == "script"
            || el
                .attributes()
                .iter()
                .any(|attr| attr.name().to_lowercase().starts_with("on"))
        {
            el.remove();
        }

        Ok(())
    };

    rewrite_str(
        html,
        RewriteStrSettings {
            element_content_handlers: vec![element!("*", handler)],
            ..RewriteStrSettings::default()
        },
    )
    .unwrap()
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::{
        ROOT_FOLDER_ID,
        cells::entities::cell::CellType,
        common::{
            sqlite_repositories_context::SqliteRepositoriesContext,
            traits::repositories_context::RepositoriesContext,
        },
    };

    async fn create_test_dependencies() -> (SqliteRepositoriesContext, FileSystemService) {
        let context = SqliteRepositoriesContext::create_testing_context().await;
        let cell_service = CellService::new(context.cell_repository(), context.review_repository());
        let service = FileSystemService::new(
            Arc::new(cell_service),
            context.folder_repository(),
            context.file_repository(),
            context.cell_repository(),
        );

        (context, service)
    }

    #[tokio::test]
    pub async fn create_folder_existing_folder_returned_error() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        context
            .folder_repository()
            .create(&Folder::new(
                None,
                Some(ROOT_FOLDER_ID),
                "folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .create_folder(Some(ROOT_FOLDER_ID), "folder".try_into().unwrap())
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            FileServiceError::FolderExists {
                name: "folder".into()
            },
            actual.unwrap_err()
        );
    }

    #[tokio::test]
    pub async fn create_folder_valid_input_created_folder() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        // Act

        let actual = service
            .create_folder(Some(ROOT_FOLDER_ID), "folder".try_into().unwrap())
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_ne!(Guid::nil(), actual.unwrap());
    }

    #[tokio::test]
    pub async fn rename_folder_existing_folder_returned_error() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let folder_id = Guid::new_v4();

        context
            .folder_repository()
            .create(&Folder::new(
                Some(folder_id),
                Some(ROOT_FOLDER_ID),
                "folder 1".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .folder_repository()
            .create(&Folder::new(
                None,
                Some(ROOT_FOLDER_ID),
                "folder 2".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .rename_folder(folder_id, "folder 2".try_into().unwrap())
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            FileServiceError::FolderExists {
                name: "folder 2".into()
            },
            actual.unwrap_err()
        );
    }

    #[tokio::test]
    pub async fn rename_folder_same_name_folder_not_changed() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let folder_id = Guid::new_v4();

        context
            .folder_repository()
            .create(&Folder::new(
                Some(folder_id),
                Some(ROOT_FOLDER_ID),
                "folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .rename_folder(folder_id, "folder".try_into().unwrap())
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(Ok(()), actual);
        let folder = context
            .folder_repository()
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

        let (context, service) = create_test_dependencies().await;

        let folder_id = Guid::new_v4();

        context
            .folder_repository()
            .create(&Folder::new(
                Some(folder_id),
                Some(ROOT_FOLDER_ID),
                "folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .rename_folder(folder_id, "folder 2".try_into().unwrap())
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(Ok(()), actual);
        let folder = context
            .folder_repository()
            .get_by_id(folder_id)
            .await
            .unwrap();
        assert_eq!(
            FileSystemItemName::new_unchecked("folder 2".to_string()),
            folder.name()
        );
    }

    #[tokio::test]
    pub async fn move_folder_to_nested_folder_error_returned() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let parent_folder_id = Guid::new_v4();
        let child_folder_id = Guid::new_v4();

        context
            .folder_repository()
            .create(&Folder::new(
                Some(parent_folder_id),
                Some(ROOT_FOLDER_ID),
                "parent folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .folder_repository()
            .create(&Folder::new(
                Some(child_folder_id),
                Some(parent_folder_id),
                "nested folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .move_folder(parent_folder_id, Some(child_folder_id))
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            Err(FileServiceError::CannotMoveChildIntoInnerFolder),
            actual
        );
    }

    #[tokio::test]
    pub async fn move_folder_two_level_down_nested_folder_error_returned() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let parent_folder_id = Guid::new_v4();
        let child_folder_id1 = Guid::new_v4();
        let child_folder_id2 = Guid::new_v4();

        context
            .folder_repository()
            .create(&Folder::new(
                Some(parent_folder_id),
                Some(ROOT_FOLDER_ID),
                "parent folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .folder_repository()
            .create(&Folder::new(
                Some(child_folder_id1),
                Some(parent_folder_id),
                "nested folder 1".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .folder_repository()
            .create(&Folder::new(
                Some(child_folder_id2),
                Some(child_folder_id1),
                "nested folder 2".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .move_folder(parent_folder_id, Some(child_folder_id2))
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            Err(FileServiceError::CannotMoveChildIntoInnerFolder),
            actual
        );
    }

    #[tokio::test]
    pub async fn move_folder_existing_folder_error_returned() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let parent_folder_id = Guid::new_v4();
        let child_folder_id1 = Guid::new_v4();
        let child_folder_id2 = Guid::new_v4();

        context
            .folder_repository()
            .create(&Folder::new(
                Some(parent_folder_id),
                Some(ROOT_FOLDER_ID),
                "parent folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .folder_repository()
            .create(&Folder::new(
                Some(child_folder_id1),
                Some(parent_folder_id),
                "child folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .folder_repository()
            .create(&Folder::new(
                Some(child_folder_id2),
                Some(ROOT_FOLDER_ID),
                "child folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .move_folder(child_folder_id2, Some(parent_folder_id))
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            Err(FileServiceError::FolderExists {
                name: "child folder".to_string()
            }),
            actual
        );
    }

    #[tokio::test]
    pub async fn move_folder_valid_input_moved_folder() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let parent_folder_id1 = Guid::new_v4();
        let parent_folder_id2 = Guid::new_v4();
        let child_folder_id = Guid::new_v4();

        context
            .folder_repository()
            .create(&Folder::new(
                Some(parent_folder_id1),
                Some(ROOT_FOLDER_ID),
                "parent folder 1".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .folder_repository()
            .create(&Folder::new(
                Some(parent_folder_id2),
                Some(ROOT_FOLDER_ID),
                "parent folder 2".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .folder_repository()
            .create(&Folder::new(
                Some(child_folder_id),
                Some(parent_folder_id1),
                "child folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .move_folder(child_folder_id, Some(parent_folder_id2))
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(Ok(()), actual);
        let folder = context
            .folder_repository()
            .get_by_id(child_folder_id)
            .await
            .unwrap();
        assert_eq!(Some(parent_folder_id2), folder.parent_id());
    }

    #[tokio::test]
    pub async fn create_file_existing_file_returned_error() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        context
            .file_repository()
            .create(&File::new(
                None,
                Some(ROOT_FOLDER_ID),
                "file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .create_file(Some(ROOT_FOLDER_ID), "file".try_into().unwrap())
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            FileServiceError::FileExists {
                name: "file".into()
            },
            actual.unwrap_err()
        );
    }

    #[tokio::test]
    pub async fn rename_file_existing_file_returned_error() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let file_id = Guid::new_v4();

        context
            .file_repository()
            .create(&File::new(
                Some(file_id),
                Some(ROOT_FOLDER_ID),
                "file 1".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .file_repository()
            .create(&File::new(
                None,
                Some(ROOT_FOLDER_ID),
                "file 2".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .rename_file(file_id, "file 2".try_into().unwrap())
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            FileServiceError::FileExists {
                name: "file 2".into()
            },
            actual.unwrap_err()
        );
    }

    #[tokio::test]
    pub async fn rename_file_same_name_file_not_changed() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let file_id = Guid::new_v4();

        context
            .file_repository()
            .create(&File::new(
                Some(file_id),
                Some(ROOT_FOLDER_ID),
                "file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .rename_file(file_id, "file".try_into().unwrap())
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(Ok(()), actual);
        let file = context.file_repository().get_by_id(file_id).await.unwrap();
        assert_eq!(
            FileSystemItemName::new_unchecked("file".to_string()),
            file.name()
        );
    }

    #[tokio::test]
    pub async fn rename_file_valid_input_renamed_file() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let file_id = Guid::new_v4();

        context
            .file_repository()
            .create(&File::new(
                Some(file_id),
                Some(ROOT_FOLDER_ID),
                "file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .rename_file(file_id, "file 2".try_into().unwrap())
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(Ok(()), actual);
        let file = context.file_repository().get_by_id(file_id).await.unwrap();
        assert_eq!(
            FileSystemItemName::new_unchecked("file 2".to_string()),
            file.name()
        );
    }

    #[tokio::test]
    pub async fn move_file_existing_file_error_returned() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let parent_folder_id = Guid::new_v4();
        let child_file_id1 = Guid::new_v4();
        let child_file_id2 = Guid::new_v4();

        context
            .folder_repository()
            .create(&Folder::new(
                Some(parent_folder_id),
                Some(ROOT_FOLDER_ID),
                "parent folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .file_repository()
            .create(&File::new(
                Some(child_file_id1),
                Some(parent_folder_id),
                "child file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .file_repository()
            .create(&File::new(
                Some(child_file_id2),
                Some(ROOT_FOLDER_ID),
                "child file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .move_file(child_file_id2, Some(parent_folder_id))
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(
            Err(FileServiceError::FileExists {
                name: "child file".to_string()
            }),
            actual
        );
    }

    #[tokio::test]
    pub async fn move_file_valid_input_moved_file() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let parent_folder_id1 = Guid::new_v4();
        let parent_folder_id2 = Guid::new_v4();
        let child_file_id = Guid::new_v4();

        context
            .folder_repository()
            .create(&Folder::new(
                Some(parent_folder_id1),
                Some(ROOT_FOLDER_ID),
                "parent folder 1".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .folder_repository()
            .create(&Folder::new(
                Some(parent_folder_id2),
                Some(ROOT_FOLDER_ID),
                "parent folder 2".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .file_repository()
            .create(&File::new(
                Some(child_file_id),
                Some(parent_folder_id1),
                "child file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .move_file(child_file_id, Some(parent_folder_id2))
            .await;
        context.save_changes().await.unwrap();

        // Assert

        assert_eq!(Ok(()), actual);
        let file = context
            .file_repository()
            .get_by_id(child_file_id)
            .await
            .unwrap();
        assert_eq!(Some(parent_folder_id2), file.parent_id());
    }

    #[tokio::test]
    pub async fn convert_folder_to_exported_item_valid_input_converted_folder_and_file() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let parent_folder_id = Guid::new_v4();
        let nested_folder_id = Guid::new_v4();
        let file_id = Guid::new_v4();

        context
            .folder_repository()
            .create(&Folder::new(
                Some(parent_folder_id),
                Some(ROOT_FOLDER_ID),
                "parent folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .folder_repository()
            .create(&Folder::new(
                Some(nested_folder_id),
                Some(parent_folder_id),
                "nested folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .file_repository()
            .create(&File::new(
                Some(file_id),
                Some(nested_folder_id),
                "file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();

        service
            .cell_service
            .create_cell(file_id, "note 1".to_string(), CellType::Note, 0)
            .await
            .unwrap();
        service
            .cell_service
            .create_cell(file_id, "note 2".to_string(), CellType::Note, 1)
            .await
            .unwrap();

        context.save_changes().await.unwrap();

        // Act

        let actual = service
            .convert_folder_to_exported_item(parent_folder_id)
            .await
            .unwrap();

        // Assert

        assert_eq!(
            FileSystemItemName::new_unchecked("parent folder".to_string()),
            actual.name
        );
        assert_eq!(None, actual.cells);
        assert_eq!(ExportedItemType::Folder, actual.item_type);

        let actual_nested_folder = actual.children.unwrap().remove(0);
        assert_eq!(
            FileSystemItemName::new_unchecked("nested folder".to_string()),
            actual_nested_folder.name
        );
        assert_eq!(None, actual_nested_folder.cells);
        assert_eq!(ExportedItemType::Folder, actual_nested_folder.item_type);

        let actual_file = actual_nested_folder.children.unwrap().remove(0);
        assert_eq!(
            FileSystemItemName::new_unchecked("file".to_string()),
            actual_file.name
        );
        assert_eq!(ExportedItemType::File, actual_file.item_type);

        let actual_cells = actual_file.cells.unwrap();
        assert!(
            actual_cells
                .iter()
                .any(|c| c.cell_type == CellType::Note && c.content == "note 1")
        );
        assert!(
            actual_cells
                .iter()
                .any(|c| c.cell_type == CellType::Note && c.content == "note 2")
        );
    }

    #[tokio::test]
    pub async fn import_exported_item_valid_input_imported_folders_and_files() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let parent_folder_id = Guid::new_v4();
        let nested_folder_id = Guid::new_v4();
        let file_id = Guid::new_v4();

        context
            .folder_repository()
            .create(&Folder::new(
                Some(parent_folder_id),
                Some(ROOT_FOLDER_ID),
                "parent folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .folder_repository()
            .create(&Folder::new(
                Some(nested_folder_id),
                Some(parent_folder_id),
                "nested folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        context
            .file_repository()
            .create(&File::new(
                Some(file_id),
                Some(nested_folder_id),
                "file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();

        service
            .cell_service
            .create_cell(file_id, "note 1".to_string(), CellType::Note, 0)
            .await
            .unwrap();
        service
            .cell_service
            .create_cell(
                file_id,
                "content<script>alert('hello')</script><button onLoad='alert'>button</button>"
                    .to_string(),
                CellType::Note,
                1,
            )
            .await
            .unwrap();

        context.save_changes().await.unwrap();

        let exported_item = service
            .convert_folder_to_exported_item(parent_folder_id)
            .await
            .unwrap();

        context
            .folder_repository()
            .delete_by_id(parent_folder_id)
            .await
            .unwrap();

        context.save_changes().await.unwrap();

        // Act

        service
            .import_exported_item(ROOT_FOLDER_ID, exported_item)
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Assert

        let all_folders = context.folder_repository().get_all_folders().await.unwrap();
        assert_eq!(3, all_folders.len());
        let actual_parent_folder = all_folders
            .iter()
            .find(|f| {
                f.name() == FileSystemItemName::new_unchecked("parent folder".to_string())
                    && f.parent_id().unwrap() == ROOT_FOLDER_ID
            })
            .unwrap();
        let actual_nested_folder = all_folders
            .iter()
            .find(|f| {
                f.name() == FileSystemItemName::new_unchecked("nested folder".to_string())
                    && f.parent_id().unwrap() == actual_parent_folder.id()
            })
            .unwrap();

        let all_files = context.file_repository().get_all_files().await.unwrap();
        assert_eq!(1, all_files.len());
        let actual_file = all_files
            .iter()
            .find(|f| {
                f.name() == FileSystemItemName::new_unchecked("file".to_string())
                    && f.parent_id().unwrap() == actual_nested_folder.id()
            })
            .unwrap();

        let all_cells = context
            .cell_repository()
            .get_file_cells_ordered_by_index(actual_file.id())
            .await
            .unwrap();
        assert_eq!(2, all_cells.len());
        assert!(
            all_cells
                .iter()
                .any(|c| c.content() == "note 1" && c.cell_type() == &CellType::Note)
        );
        // Verifying that all JS is removed.
        assert!(
            all_cells
                .iter()
                .all(|c| !c.content().contains("script") && !c.content().contains("onLoad"))
        );
    }
}
