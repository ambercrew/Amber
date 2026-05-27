use std::sync::Arc;

use async_trait::async_trait;
use rig::{completion::ToolDefinition, tool::Tool};
use schemars::schema_for;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::sync::Mutex;

use crate::{
    Guid, ROOT_FOLDER_ID,
    ai_integration::{
        entities::message::{Message, MessageContent, ToolCallDisplayContent, ToolCallStatus},
        services::ai_streamer::{OnEventCallback, OnEventCallbackError, StreamLlmResponseEvent},
        tools::{AcceptToolCall, AcceptToolCallError},
    },
    common::repository_error::RepositoryError,
    file_system::{
        repositories::folder_repository::FolderRepository, services::item_creator::FolderCreator,
        value_objects::file_system_item_name::FileSystemItemName,
    },
};

#[derive(Deserialize, Debug, Clone, Serialize, schemars::JsonSchema)]
pub struct CreateFolderArgs {
    #[schemars(description = "The name of the folder to create")]
    pub name: String,
    #[schemars(
        description = "The ID of the parent folder. Omit or set to null to create at root level."
    )]
    pub parent_id: Option<String>,
}

#[derive(Error, Debug)]
pub enum CreateFolderError {
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
    #[error(transparent)]
    OnEventCallback(#[from] OnEventCallbackError),
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error("'{0}' is not a valid folder ID — must be a UUID")]
    InvalidParentId(String),
    #[error("No folder found with ID '{0}'")]
    ParentFolderNotFound(String),
}

pub struct CreateFolder {
    chat_id: Guid,
    messages_to_upsert: Arc<Mutex<Vec<Message>>>,
    on_event: Option<OnEventCallback>,
    folder_repository: Arc<dyn FolderRepository>,
}

impl CreateFolder {
    pub fn new(
        chat_id: Guid,
        messages_to_upsert: Arc<Mutex<Vec<Message>>>,
        on_event: Option<OnEventCallback>,
        folder_repository: Arc<dyn FolderRepository>,
    ) -> Self {
        Self {
            chat_id,
            messages_to_upsert,
            on_event,
            folder_repository,
        }
    }
}

impl Tool for CreateFolder {
    const NAME: &'static str = "create_folder";

    type Error = CreateFolderError;
    type Args = CreateFolderArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let parameters = serde_json::to_value(schema_for!(CreateFolderArgs)).unwrap();

        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Creates a new folder.".to_string(),
            parameters,
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let tool_call_id = Guid::new_v4().to_string();

        let parent_description = match args.parent_id.as_deref() {
            None => "[root level]".to_string(),
            Some(id) => {
                let parent_guid = Guid::parse_str(id)
                    .map_err(|_| CreateFolderError::InvalidParentId(id.to_string()))?;

                self.folder_repository
                    .get_by_id(parent_guid)
                    .await
                    .map_err(|e| match e {
                        RepositoryError::NotFound(_) => {
                            CreateFolderError::ParentFolderNotFound(id.to_string())
                        }
                        other => CreateFolderError::Repository(other),
                    })?
                    .name()
                    .to_string()
            }
        };

        let message = Message::new(
            None,
            self.chat_id,
            MessageContent::ToolCallDisplay(ToolCallDisplayContent {
                id: tool_call_id,
                name: Self::NAME.to_string(),
                arguments: serde_json::to_value(&args)?,
                display_name: "📁 Create folder".to_string(),
                display_description_markdown: format!(
                    "**Name**: {}\n\n**Parent folder**: {}",
                    args.name, parent_description
                ),
                status: ToolCallStatus::Pending,
                file_id: None,
            }),
        );

        if let Some(on_event) = self.on_event.as_ref() {
            on_event(StreamLlmResponseEvent::ToolCalled(message.clone()))?;
        }

        self.messages_to_upsert.lock().await.push(message);
        Ok("Request to create the folder has been presented to the user for approval.".to_string())
    }
}

pub struct AcceptCreateFolder {
    folder_creator: Arc<dyn FolderCreator>,
}

impl AcceptCreateFolder {
    pub fn new(folder_creator: Arc<dyn FolderCreator>) -> Self {
        Self { folder_creator }
    }
}

#[async_trait]
impl AcceptToolCall for AcceptCreateFolder {
    type Args = CreateFolderArgs;

    async fn accept_call(
        &self,
        _tool_call: &ToolCallDisplayContent,
        args: Self::Args,
    ) -> Result<(), AcceptToolCallError> {
        let parent_id = match args.parent_id.as_deref() {
            Some(id) => Guid::parse_str(id).map_err(|_| {
                AcceptToolCallError::MissingArguments("Invalid parent folder ID".to_string())
            })?,
            None => ROOT_FOLDER_ID,
        };

        let name = FileSystemItemName::try_from(args.name.as_str())
            .map_err(|e| AcceptToolCallError::MissingArguments(e.to_string()))?;

        self.folder_creator
            .create_folder(Some(parent_id), name)
            .await?;

        Ok(())
    }
}

#[cfg(test)]
pub mod create_folder_tests {
    use injector::{injector::Injector, register_scope};

    use crate::{
        ROOT_FOLDER_ID,
        file_system::{
            repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
            services::{
                implementations::default_item_creator::DefaultItemCreator,
                item_creator::FolderCreator,
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
        injector
    }

    #[tokio::test]
    pub async fn call_no_parent_id_shows_root_level() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repository = scope.resolve::<dyn FolderRepository>().await;
        let chat_id = Guid::new_v4();
        let messages_to_upsert = Arc::new(Mutex::new(Vec::new()));

        let tool = CreateFolder::new(chat_id, messages_to_upsert.clone(), None, folder_repository);

        // Act

        tool.call(CreateFolderArgs {
            name: "Science".to_string(),
            parent_id: None,
        })
        .await
        .unwrap();

        // Assert

        let messages = messages_to_upsert.lock().await;
        if let MessageContent::ToolCallDisplay(display) = messages[0].content() {
            assert!(
                display
                    .display_description_markdown
                    .contains("[root level]")
            );
        } else {
            panic!("Not correct message content");
        }
    }

    #[tokio::test]
    pub async fn call_valid_parent_id_shows_folder_name() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();

        let parent_id = scope
            .resolve::<dyn FolderCreator>()
            .await
            .create_folder(
                Some(ROOT_FOLDER_ID),
                FileSystemItemName::new_unchecked("Biology".to_string()),
            )
            .await
            .unwrap();

        let folder_repository = scope.resolve::<dyn FolderRepository>().await;
        let messages_to_upsert = Arc::new(Mutex::new(Vec::new()));
        let tool = CreateFolder::new(
            Guid::new_v4(),
            messages_to_upsert.clone(),
            None,
            folder_repository,
        );

        // Act

        tool.call(CreateFolderArgs {
            name: "Notes".to_string(),
            parent_id: Some(parent_id.to_string()),
        })
        .await
        .unwrap();

        // Assert

        let messages = messages_to_upsert.lock().await;
        if let MessageContent::ToolCallDisplay(display) = messages[0].content() {
            assert!(display.display_description_markdown.contains("Biology"));
        } else {
            panic!("Not correct message content");
        }
    }

    #[tokio::test]
    pub async fn call_nonexistent_parent_id_returns_error() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repository = scope.resolve::<dyn FolderRepository>().await;

        let tool = CreateFolder::new(
            Guid::new_v4(),
            Arc::new(Mutex::new(Vec::new())),
            None,
            folder_repository,
        );

        // Act

        let result = tool
            .call(CreateFolderArgs {
                name: "Notes".to_string(),
                parent_id: Some(Guid::new_v4().to_string()),
            })
            .await;

        // Assert

        assert!(matches!(
            result,
            Err(CreateFolderError::ParentFolderNotFound(_))
        ));
    }

    #[tokio::test]
    pub async fn call_fired_on_event_and_added_pending_message() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repository = scope.resolve::<dyn FolderRepository>().await;
        let chat_id = Guid::new_v4();
        let messages_to_upsert = Arc::new(Mutex::new(Vec::new()));

        let received_on_event = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let received_clone = received_on_event.clone();

        let tool = CreateFolder::new(
            chat_id,
            messages_to_upsert.clone(),
            Some(Arc::new(move |_| {
                received_clone.store(true, std::sync::atomic::Ordering::Relaxed);
                Ok(())
            })),
            folder_repository,
        );

        // Act

        tool.call(CreateFolderArgs {
            name: "Science".to_string(),
            parent_id: None,
        })
        .await
        .unwrap();

        // Assert

        assert!(received_on_event.load(std::sync::atomic::Ordering::Relaxed));
        let messages = messages_to_upsert.lock().await;
        assert_eq!(1, messages.len());
        assert_eq!(chat_id, messages[0].chat_id());

        if let MessageContent::ToolCallDisplay(display) = messages[0].content() {
            assert_eq!(CreateFolder::NAME, display.name);
            assert_eq!("📁 Create folder", display.display_name);
            assert_eq!(ToolCallStatus::Pending, display.status);
            assert!(display.display_description_markdown.contains("Science"));
        } else {
            panic!("Not correct message content");
        }
    }

    #[tokio::test]
    pub async fn accept_call_creates_folder() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();

        let folder_creator = scope.resolve::<dyn FolderCreator>().await;
        let folder_repository = scope.resolve::<dyn FolderRepository>().await;

        let accept = AcceptCreateFolder::new(folder_creator);

        // Act

        accept
            .accept_call(
                &ToolCallDisplayContent {
                    id: "".to_string(),
                    name: CreateFolder::NAME.to_string(),
                    arguments: serde_json::Value::Null,
                    display_name: "".to_string(),
                    display_description_markdown: "".to_string(),
                    status: ToolCallStatus::Pending,
                    file_id: None,
                },
                CreateFolderArgs {
                    name: "Science".to_string(),
                    parent_id: Some(ROOT_FOLDER_ID.to_string()),
                },
            )
            .await
            .unwrap();

        // Assert

        let folders = folder_repository.get_all_folders().await.unwrap();
        assert!(folders.iter().any(|f| f.name().to_string() == "Science"));
    }
}
