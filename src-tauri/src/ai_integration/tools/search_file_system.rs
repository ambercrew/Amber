use std::sync::Arc;

use rig::{completion::ToolDefinition, tool::Tool};
use schemars::schema_for;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    common::repository_error::RepositoryError,
    file_system::{
        entities::{file::File, folder::Folder},
        repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
        value_objects::file_system_item_type::FileSystemItemType,
    },
};

#[derive(Deserialize, Debug, Clone, Serialize, schemars::JsonSchema)]
pub struct SearchFileSystemArgs {
    #[schemars(
        description = "The name (or partial name) to search for. Case-insensitive substring match."
    )]
    pub query: String,
}

#[derive(Debug, Serialize)]
pub struct FileSystemSearchResult {
    pub item_type: FileSystemItemType,
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
}

const MAX_SEARCH_RESULTS_PER_TYPE: i64 = 5;

impl From<Folder> for FileSystemSearchResult {
    fn from(folder: Folder) -> Self {
        Self {
            item_type: FileSystemItemType::Folder,
            id: folder.id().to_string(),
            name: folder.name().to_string(),
            parent_id: folder.parent_id().map(|id| id.to_string()),
        }
    }
}

impl From<File> for FileSystemSearchResult {
    fn from(file: File) -> Self {
        Self {
            item_type: FileSystemItemType::File,
            id: file.id().to_string(),
            name: file.name().to_string(),
            parent_id: file.parent_id().map(|id| id.to_string()),
        }
    }
}

#[derive(Error, Debug)]
pub enum SearchFileSystemError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
}

pub struct SearchFileSystem {
    file_repository: Arc<dyn FileRepository>,
    folder_repository: Arc<dyn FolderRepository>,
}

impl SearchFileSystem {
    pub fn new(
        file_repository: Arc<dyn FileRepository>,
        folder_repository: Arc<dyn FolderRepository>,
    ) -> Self {
        Self {
            file_repository,
            folder_repository,
        }
    }
}

impl Tool for SearchFileSystem {
    const NAME: &'static str = "search_file_system";

    type Error = SearchFileSystemError;
    type Args = SearchFileSystemArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let parameters = serde_json::to_value(schema_for!(SearchFileSystemArgs)).unwrap();

        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Searches the user's files and folders by name. \
                Returns matching files and folders with their IDs, names, \
                parent folder IDs, and types. Use this to look up a file or \
                folder ID before performing operations that require one."
                .to_string(),
            parameters,
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let files = self
            .file_repository
            .search_by_name(&args.query, MAX_SEARCH_RESULTS_PER_TYPE)
            .await?;
        let folders = self
            .folder_repository
            .search_by_name(&args.query, MAX_SEARCH_RESULTS_PER_TYPE)
            .await?;

        let results: Vec<FileSystemSearchResult> = folders
            .into_iter()
            .map(Into::into)
            .chain(files.into_iter().map(Into::into))
            .collect();

        if results.is_empty() {
            return Ok(format!(
                "No files or folders found matching '{}'.",
                args.query
            ));
        }

        Ok(serde_json::to_string_pretty(&results)?)
    }
}

#[cfg(test)]
pub mod search_file_system_tests {
    use injector::{injector::Injector, register_scope};

    use crate::{
        ROOT_FOLDER_ID,
        file_system::{
            repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
            services::{
                implementations::default_item_creator::DefaultItemCreator,
                item_creator::{FileCreator, FolderCreator},
            },
            value_objects::file_system_item_name::FileSystemItemName,
        },
        infrastructure::repositories::sqlite::{
            sqlite_file_repository::SqliteFileRepository,
            sqlite_folder_repository::SqliteFolderRepository,
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn FolderCreator, DefaultItemCreator);
        register_scope!(injector, dyn FileCreator, DefaultItemCreator);
        injector
    }

    #[tokio::test]
    pub async fn call_matching_name_returns_results() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();

        scope
            .resolve::<dyn FileCreator>()
            .await
            .create_file(
                Some(ROOT_FOLDER_ID),
                FileSystemItemName::new_unchecked("Biology Notes".to_string()),
            )
            .await
            .unwrap();

        scope
            .resolve::<dyn FileCreator>()
            .await
            .create_file(
                Some(ROOT_FOLDER_ID),
                FileSystemItemName::new_unchecked("History Notes".to_string()),
            )
            .await
            .unwrap();

        let tool = SearchFileSystem::new(
            scope.resolve::<dyn FileRepository>().await,
            scope.resolve::<dyn FolderRepository>().await,
        );

        // Act

        let result = tool
            .call(SearchFileSystemArgs {
                query: "biology".to_string(),
            })
            .await
            .unwrap();

        // Assert

        assert!(result.contains("Biology Notes"));
        assert!(!result.contains("History Notes"));
    }

    #[tokio::test]
    pub async fn call_no_match_returns_not_found_message() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();

        let tool = SearchFileSystem::new(
            scope.resolve::<dyn FileRepository>().await,
            scope.resolve::<dyn FolderRepository>().await,
        );

        // Act

        let result = tool
            .call(SearchFileSystemArgs {
                query: "nonexistent".to_string(),
            })
            .await
            .unwrap();

        // Assert

        assert!(result.contains("No files or folders found matching"));
    }

    #[tokio::test]
    pub async fn call_case_insensitive_match_returns_results() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();

        scope
            .resolve::<dyn FileCreator>()
            .await
            .create_file(
                Some(ROOT_FOLDER_ID),
                FileSystemItemName::new_unchecked("Chemistry".to_string()),
            )
            .await
            .unwrap();

        let tool = SearchFileSystem::new(
            scope.resolve::<dyn FileRepository>().await,
            scope.resolve::<dyn FolderRepository>().await,
        );

        // Act

        let result = tool
            .call(SearchFileSystemArgs {
                query: "CHEMISTRY".to_string(),
            })
            .await
            .unwrap();

        // Assert

        assert!(result.contains("Chemistry"));
    }

    #[tokio::test]
    pub async fn call_folder_match_returns_folder_result() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();

        scope
            .resolve::<dyn FolderCreator>()
            .await
            .create_folder(
                Some(ROOT_FOLDER_ID),
                FileSystemItemName::new_unchecked("Science".to_string()),
            )
            .await
            .unwrap();

        let tool = SearchFileSystem::new(
            scope.resolve::<dyn FileRepository>().await,
            scope.resolve::<dyn FolderRepository>().await,
        );

        // Act

        let result = tool
            .call(SearchFileSystemArgs {
                query: "science".to_string(),
            })
            .await
            .unwrap();

        // Assert

        assert!(result.contains("Science"));
        assert!(result.contains("folder"));
    }
}
