use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    cells::repositories::cell_repository::CellRepository,
    file_system::{
        repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
        services::item_exporter::{ItemExporter, ItemExporterError},
        value_objects::exported_item::{ExportedItem, ExportedItemType},
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultItemExporter {
    folder_repository: Arc<dyn FolderRepository>,
    file_repository: Arc<dyn FileRepository>,
    cell_repository: Arc<dyn CellRepository>,
}

#[async_trait]
impl ItemExporter for DefaultItemExporter {
    async fn convert_folder_to_exported_item(
        &self,
        folder_id: Guid,
    ) -> Result<ExportedItem, ItemExporterError> {
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

    async fn convert_file_to_exported_item(
        &self,
        file_id: Guid,
    ) -> Result<ExportedItem, ItemExporterError> {
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
}

#[cfg(test)]
pub mod tests {
    use injector::{injector::Injector, register_scope};

    use super::*;
    use crate::{
        Guid, ROOT_FOLDER_ID,
        cells::{
            dto::create_cell_request_dto::CreateCellRequestDto,
            entities::cell::CellType,
            repositories::cell_repository::CellRepository,
            services::{
                cell_creator::CellCreator,
                implementations::default_cell_creator::DefaultCellCreator,
            },
        },
        file_system::{
            entities::{file::File, folder::Folder},
            repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
            services::item_exporter::ItemExporter,
            value_objects::exported_item::ExportedItemType,
            value_objects::{
                file_system_item_name::FileSystemItemName, fsrs_profile_choice::FsrsProfileChoice,
            },
        },
        infrastructure::{
            extensions::unit_of_work::UnitOfWorkExt,
            repositories::sqlite::{
                sqlite_cell_repository::SqliteCellRepository,
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
        register_scope!(injector, dyn CellRepository, SqliteCellRepository);
        register_scope!(injector, dyn CellCreator, DefaultCellCreator);
        register_scope!(injector, DefaultItemExporter);
        injector
    }

    #[tokio::test]
    pub async fn convert_folder_to_exported_item_valid_input_converted_folder_and_file() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultItemExporter>().await;

        let parent_folder_id = Guid::new_v4();
        let nested_folder_id = Guid::new_v4();
        let file_id = Guid::new_v4();

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
                Some(nested_folder_id),
                Some(parent_folder_id),
                "nested folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FileRepository>()
            .await
            .create(&File::new(
                Some(file_id),
                Some(nested_folder_id),
                "file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();

        let cell_creator = scope.resolve::<dyn CellCreator>().await;
        cell_creator
            .create_cell(CreateCellRequestDto {
                file_id,
                content: "note 1".to_string(),
                cell_type: CellType::Note,
                index: 0,
            })
            .await
            .unwrap();
        cell_creator
            .create_cell(CreateCellRequestDto {
                file_id,
                content: "note 2".to_string(),
                cell_type: CellType::Note,
                index: 1,
            })
            .await
            .unwrap();

        scope.save_changes().await.unwrap();

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
}
