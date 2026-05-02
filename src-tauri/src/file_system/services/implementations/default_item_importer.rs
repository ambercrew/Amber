use std::collections::HashSet;
use std::sync::Arc;

use ammonia::Builder;
use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    cells::{
        dto::create_cell_request_dto::CreateCellRequestDto, services::cell_creator::CellCreator,
    },
    file_system::{
        services::{
            item_creator::{FileCreator, FolderCreator},
            item_importer::{ItemImporter, ItemImporterError},
        },
        value_objects::exported_item::{ExportedItem, ExportedItemType},
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultItemImporter {
    folder_creator: Arc<dyn FolderCreator>,
    file_creator: Arc<dyn FileCreator>,
    cell_creator: Arc<dyn CellCreator>,
}

#[async_trait]
impl ItemImporter for DefaultItemImporter {
    async fn import_exported_item(
        &self,
        import_into_folder_id: Guid,
        exported_item: ExportedItem,
    ) -> Result<(), ItemImporterError> {
        match exported_item.item_type {
            ExportedItemType::File => {
                log::info!("Importing file with name {}.", exported_item.name);

                let file_id = self
                    .file_creator
                    .create_file(Some(import_into_folder_id), exported_item.name)
                    .await?;

                for (i, cell) in exported_item
                    .cells
                    .unwrap_or_default()
                    .into_iter()
                    .enumerate()
                {
                    let purified_html = purify_html(&cell.content);
                    self.cell_creator
                        .create_cell(CreateCellRequestDto {
                            file_id,
                            content: purified_html,
                            cell_type: cell.cell_type,
                            index: i as u32,
                        })
                        .await?;
                }
            }
            ExportedItemType::Folder => {
                log::info!("Importing folder with name {}.", exported_item.name);

                let folder_id = self
                    .folder_creator
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
    Builder::new()
        .add_tags(&["cloze"])
        .add_tag_attributes("cloze", &["index"])
        .url_schemes(HashSet::from(["http", "https", "mailto", "data"]))
        .clean(html)
        .to_string()
}

#[cfg(test)]
pub mod tests {
    use injector::{injector::Injector, register_scope};

    use super::*;
    use crate::{
        ROOT_FOLDER_ID,
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
            services::{
                implementations::{
                    default_item_creator::DefaultItemCreator,
                    default_item_exporter::DefaultItemExporter,
                },
                item_creator::{FileCreator, FolderCreator},
                item_exporter::ItemExporter,
                item_importer::ItemImporter,
            },
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
        register_scope!(injector, dyn FolderCreator, DefaultItemCreator);
        register_scope!(injector, dyn FileCreator, DefaultItemCreator);
        register_scope!(injector, DefaultItemCreator);
        register_scope!(injector, DefaultItemExporter);
        register_scope!(injector, DefaultItemImporter);
        injector
    }

    #[tokio::test]
    pub async fn import_exported_item_valid_input_imported_folders_and_files() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let exporter = scope.resolve::<DefaultItemExporter>().await;
        let importer = scope.resolve::<DefaultItemImporter>().await;
        let cell_creator = scope.resolve::<dyn CellCreator>().await;

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
                content:
                    "content<script>alert('hello')</script><button onLoad='alert'>button</button>"
                        .to_string(),
                cell_type: CellType::Note,
                index: 1,
            })
            .await
            .unwrap();

        scope.save_changes().await.unwrap();

        let exported_item = exporter
            .convert_folder_to_exported_item(parent_folder_id)
            .await
            .unwrap();

        scope
            .resolve::<dyn FolderRepository>()
            .await
            .delete_by_id(parent_folder_id)
            .await
            .unwrap();

        scope.save_changes().await.unwrap();

        // Act

        importer
            .import_exported_item(ROOT_FOLDER_ID, exported_item)
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let all_folders = scope
            .resolve::<dyn FolderRepository>()
            .await
            .get_all_folders()
            .await
            .unwrap();
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

        let all_files = scope
            .resolve::<dyn FileRepository>()
            .await
            .get_all_files()
            .await
            .unwrap();
        assert_eq!(1, all_files.len());
        let actual_file = all_files
            .iter()
            .find(|f| {
                f.name() == FileSystemItemName::new_unchecked("file".to_string())
                    && f.parent_id().unwrap() == actual_nested_folder.id()
            })
            .unwrap();

        let all_cells = scope
            .resolve::<dyn CellRepository>()
            .await
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
