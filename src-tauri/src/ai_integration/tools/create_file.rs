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
    cells::{
        dto::create_cell_request_dto::CreateCellRequestDto, entities::cell::CellType,
        services::cell_creator::CellCreator, value_objects::flash_card::FlashCard,
    },
    common::repository_error::RepositoryError,
    file_system::{
        repositories::folder_repository::FolderRepository, services::item_creator::FileCreator,
        value_objects::file_system_item_name::FileSystemItemName,
    },
};

#[derive(Deserialize, Debug, Clone, Serialize, schemars::JsonSchema)]
pub struct FlashCardInput {
    #[schemars(description = "The question shown to the user")]
    pub question: String,
    #[schemars(
        description = "The correct answer. Must be as concise as possible — a word, phrase, or single sentence."
    )]
    pub answer: String,
}

#[derive(Deserialize, Debug, Clone, Serialize, schemars::JsonSchema)]
pub struct CreateFileArgs {
    #[schemars(description = "The name of the file to create")]
    pub name: String,
    #[schemars(
        description = "The ID of the parent folder. Omit or set to null to create at root level."
    )]
    pub parent_id: Option<String>,
    #[schemars(
        description = "Optional flashcards to add to the file upon creation. Each flashcard has a question and a concise answer."
    )]
    pub flashcards: Option<Vec<FlashCardInput>>,
}

#[derive(Error, Debug)]
pub enum CreateFileError {
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

pub struct CreateFile {
    chat_id: Guid,
    messages_to_upsert: Arc<Mutex<Vec<Message>>>,
    on_event: Option<OnEventCallback>,
    folder_repository: Arc<dyn FolderRepository>,
}

impl CreateFile {
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

impl Tool for CreateFile {
    const NAME: &'static str = "create_file";

    type Error = CreateFileError;
    type Args = CreateFileArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let parameters = serde_json::to_value(schema_for!(CreateFileArgs)).unwrap();

        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Creates a new file. Optionally include flashcards to populate it."
                .to_string(),
            parameters,
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let tool_call_id = Guid::new_v4().to_string();

        let parent_description = match args.parent_id.as_deref() {
            None => "[root level]".to_string(),
            Some(id) => {
                let parent_guid = Guid::parse_str(id)
                    .map_err(|_| CreateFileError::InvalidParentId(id.to_string()))?;

                self.folder_repository
                    .get_by_id(parent_guid)
                    .await
                    .map_err(|e| match e {
                        RepositoryError::NotFound(_) => {
                            CreateFileError::ParentFolderNotFound(id.to_string())
                        }
                        other => CreateFileError::Repository(other),
                    })?
                    .name()
                    .to_string()
            }
        };

        let flashcard_count = args.flashcards.as_ref().map_or(0, |fc| fc.len());

        let mut description = format!(
            "**Name**: {}\n\n**Parent folder**: {}",
            args.name, parent_description
        );

        if flashcard_count > 0 {
            description.push_str(&format!("\n\n**Flashcards**: {flashcard_count}"));
        }

        let message = Message::new(
            None,
            self.chat_id,
            MessageContent::ToolCallDisplay(ToolCallDisplayContent {
                id: tool_call_id,
                name: Self::NAME.to_string(),
                arguments: serde_json::to_value(&args)?,
                display_name: "📄 Create file".to_string(),
                display_description_markdown: description,
                status: ToolCallStatus::Pending,
                file_id: None,
            }),
        );

        if let Some(on_event) = self.on_event.as_ref() {
            on_event(StreamLlmResponseEvent::ToolCalled(message.clone()))?;
        }

        self.messages_to_upsert.lock().await.push(message);
        Ok("Request to create the file has been presented to the user for approval.".to_string())
    }
}

pub struct AcceptCreateFile {
    file_creator: Arc<dyn FileCreator>,
    cell_creator: Arc<dyn CellCreator>,
}

impl AcceptCreateFile {
    pub fn new(file_creator: Arc<dyn FileCreator>, cell_creator: Arc<dyn CellCreator>) -> Self {
        Self {
            file_creator,
            cell_creator,
        }
    }
}

#[async_trait]
impl AcceptToolCall for AcceptCreateFile {
    type Args = CreateFileArgs;

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

        let file_id = self.file_creator.create_file(Some(parent_id), name).await?;

        for (index, flashcard) in args.flashcards.unwrap_or_default().into_iter().enumerate() {
            let content = serde_json::to_string(&FlashCard {
                question: markdown::to_html(&flashcard.question),
                answer: markdown::to_html(&flashcard.answer),
            })?;

            self.cell_creator
                .create_cell(CreateCellRequestDto {
                    file_id,
                    content,
                    cell_type: CellType::FlashCard,
                    index: index as u32,
                })
                .await?;
        }

        Ok(())
    }
}

#[cfg(test)]
pub mod create_file_tests {
    use injector::{injector::Injector, register_scope};

    use crate::{
        ROOT_FOLDER_ID,
        cells::{
            repositories::{cell_repository::CellRepository, review_repository::ReviewRepository},
            services::{
                cell_creator::CellCreator,
                implementations::default_cell_creator::DefaultCellCreator,
            },
        },
        file_system::{
            repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
            services::{
                implementations::default_item_creator::DefaultItemCreator,
                item_creator::{FileCreator, FolderCreator},
            },
            value_objects::file_system_item_name::FileSystemItemName,
        },
        infrastructure::repositories::sqlite::{
            sqlite_cell_repository::SqliteCellRepository,
            sqlite_file_repository::SqliteFileRepository,
            sqlite_folder_repository::SqliteFolderRepository,
            sqlite_review_repository::SqliteReviewRepository,
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
        register_scope!(injector, dyn CellRepository, SqliteCellRepository);
        register_scope!(injector, dyn ReviewRepository, SqliteReviewRepository);
        register_scope!(injector, dyn CellCreator, DefaultCellCreator);
        injector
    }

    #[tokio::test]
    pub async fn call_no_parent_id_shows_root_level() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repository = scope.resolve::<dyn FolderRepository>().await;
        let messages_to_upsert = Arc::new(Mutex::new(Vec::new()));

        let tool = CreateFile::new(
            Guid::new_v4(),
            messages_to_upsert.clone(),
            None,
            folder_repository,
        );

        // Act

        tool.call(CreateFileArgs {
            name: "Biology Notes".to_string(),
            parent_id: None,
            flashcards: None,
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
                FileSystemItemName::new_unchecked("Science".to_string()),
            )
            .await
            .unwrap();

        let folder_repository = scope.resolve::<dyn FolderRepository>().await;
        let messages_to_upsert = Arc::new(Mutex::new(Vec::new()));
        let tool = CreateFile::new(
            Guid::new_v4(),
            messages_to_upsert.clone(),
            None,
            folder_repository,
        );

        // Act

        tool.call(CreateFileArgs {
            name: "Biology Notes".to_string(),
            parent_id: Some(parent_id.to_string()),
            flashcards: None,
        })
        .await
        .unwrap();

        // Assert

        let messages = messages_to_upsert.lock().await;
        if let MessageContent::ToolCallDisplay(display) = messages[0].content() {
            assert!(display.display_description_markdown.contains("Science"));
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

        let tool = CreateFile::new(
            Guid::new_v4(),
            Arc::new(Mutex::new(Vec::new())),
            None,
            folder_repository,
        );

        // Act

        let result = tool
            .call(CreateFileArgs {
                name: "Notes".to_string(),
                parent_id: Some(Guid::new_v4().to_string()),
                flashcards: None,
            })
            .await;

        // Assert

        assert!(matches!(
            result,
            Err(CreateFileError::ParentFolderNotFound(_))
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

        let tool = CreateFile::new(
            chat_id,
            messages_to_upsert.clone(),
            Some(Arc::new(move |_| {
                received_clone.store(true, std::sync::atomic::Ordering::Relaxed);
                Ok(())
            })),
            folder_repository,
        );

        // Act

        tool.call(CreateFileArgs {
            name: "Biology Notes".to_string(),
            parent_id: None,
            flashcards: Some(vec![
                FlashCardInput {
                    question: "Q1".to_string(),
                    answer: "A1".to_string(),
                },
                FlashCardInput {
                    question: "Q2".to_string(),
                    answer: "A2".to_string(),
                },
            ]),
        })
        .await
        .unwrap();

        // Assert

        assert!(received_on_event.load(std::sync::atomic::Ordering::Relaxed));
        let messages = messages_to_upsert.lock().await;
        assert_eq!(1, messages.len());

        if let MessageContent::ToolCallDisplay(display) = messages[0].content() {
            assert_eq!(CreateFile::NAME, display.name);
            assert_eq!("📄 Create file", display.display_name);
            assert_eq!(ToolCallStatus::Pending, display.status);
            assert!(
                display
                    .display_description_markdown
                    .contains("Biology Notes")
            );
            assert!(display.display_description_markdown.contains("2"));
        } else {
            panic!("Not correct message content");
        }
    }

    #[tokio::test]
    pub async fn accept_call_creates_file_with_flashcards() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();

        let file_creator = scope.resolve::<dyn FileCreator>().await;
        let cell_creator = scope.resolve::<dyn CellCreator>().await;
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;

        let accept = AcceptCreateFile::new(file_creator, cell_creator);

        // Act

        accept
            .accept_call(
                &ToolCallDisplayContent {
                    id: "".to_string(),
                    name: CreateFile::NAME.to_string(),
                    arguments: serde_json::Value::Null,
                    display_name: "".to_string(),
                    display_description_markdown: "".to_string(),
                    status: ToolCallStatus::Pending,
                    file_id: None,
                },
                CreateFileArgs {
                    name: "Biology Notes".to_string(),
                    parent_id: Some(ROOT_FOLDER_ID.to_string()),
                    flashcards: Some(vec![
                        FlashCardInput {
                            question: "**Q1**".to_string(),
                            answer: "A1".to_string(),
                        },
                        FlashCardInput {
                            question: "Q2".to_string(),
                            answer: "A2".to_string(),
                        },
                    ]),
                },
            )
            .await
            .unwrap();

        // Assert

        let files = file_repository.get_all_files().await.unwrap();
        let file = files
            .iter()
            .find(|f| f.name().to_string() == "Biology Notes")
            .expect("File not found");

        let cells = cell_repository
            .get_file_cells_ordered_by_index(file.id())
            .await
            .unwrap();

        assert_eq!(2, cells.len());
        assert_eq!(&CellType::FlashCard, cells[0].cell_type());
        assert_eq!(&CellType::FlashCard, cells[1].cell_type());

        let first_card: FlashCard = serde_json::from_str(cells[0].content()).unwrap();
        assert_eq!("<p><strong>Q1</strong></p>", first_card.question);
        assert_eq!("<p>A1</p>", first_card.answer);
        assert_eq!(0, cells[0].index());
        assert_eq!(1, cells[1].index());
    }

    #[tokio::test]
    pub async fn accept_call_creates_file_without_flashcards() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();

        let file_creator = scope.resolve::<dyn FileCreator>().await;
        let cell_creator = scope.resolve::<dyn CellCreator>().await;
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;

        let accept = AcceptCreateFile::new(file_creator, cell_creator);

        // Act

        accept
            .accept_call(
                &ToolCallDisplayContent {
                    id: "".to_string(),
                    name: CreateFile::NAME.to_string(),
                    arguments: serde_json::Value::Null,
                    display_name: "".to_string(),
                    display_description_markdown: "".to_string(),
                    status: ToolCallStatus::Pending,
                    file_id: None,
                },
                CreateFileArgs {
                    name: "Empty File".to_string(),
                    parent_id: Some(ROOT_FOLDER_ID.to_string()),
                    flashcards: None,
                },
            )
            .await
            .unwrap();

        // Assert

        let files = file_repository.get_all_files().await.unwrap();
        let file = files
            .iter()
            .find(|f| f.name().to_string() == "Empty File")
            .expect("File not found");

        let cells = cell_repository
            .get_file_cells_ordered_by_index(file.id())
            .await
            .unwrap();

        assert_eq!(0, cells.len());
    }
}
