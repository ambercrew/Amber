use std::sync::Arc;

use async_trait::async_trait;
use rig::{completion::ToolDefinition, tool::Tool};
use schemars::schema_for;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

use crate::{
    Guid,
    ai_integration::{
        entities::message::{Message, MessageContent, ToolCallDisplayContent, ToolCallStatus},
        services::ai_streamer::OnEventCallback,
        tools::{AcceptToolCall, AcceptToolCallError},
    },
    cells::{repositories::cell_repository::CellRepository, value_objects::flash_card::FlashCard},
};

use super::{EditCellContentError, EditToolState, emit_tool_called, fetch_cell, parse_cell_id};

#[derive(Deserialize, Debug, Clone, Serialize, schemars::JsonSchema)]
pub struct EditFlashCardContentArgs {
    #[schemars(description = "The ID of the flashcard cell to edit")]
    pub cell_id: String,
    #[schemars(description = "The question shown to the user. Use markdown, not HTML.")]
    pub question: String,
    #[schemars(
        description = "The correct answer. Must be as concise as possible — a word, phrase, or single sentence. Use markdown, not HTML."
    )]
    pub answer: String,
}

pub struct EditFlashCardContent(EditToolState);

impl EditFlashCardContent {
    pub fn new(
        chat_id: Guid,
        messages_to_upsert: Arc<Mutex<Vec<Message>>>,
        on_event: Option<OnEventCallback>,
        cell_repository: Arc<dyn CellRepository>,
    ) -> Self {
        Self(EditToolState::new(
            chat_id,
            messages_to_upsert,
            on_event,
            cell_repository,
        ))
    }
}

impl Tool for EditFlashCardContent {
    const NAME: &'static str = "edit_flash_card_content";

    type Error = EditCellContentError;
    type Args = EditFlashCardContentArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Edits the question and answer of an existing flashcard cell. \
                Use this when the user asks to change, reword, fix, or improve a flashcard."
                .to_string(),
            parameters: serde_json::to_value(schema_for!(EditFlashCardContentArgs)).unwrap(),
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let cell_id = parse_cell_id(&args.cell_id)?;
        let cell = fetch_cell(&self.0.cell_repository, &args.cell_id, cell_id).await?;

        let message = Message::new(
            None,
            self.0.chat_id,
            MessageContent::ToolCallDisplay(ToolCallDisplayContent {
                id: Guid::new_v4().to_string(),
                name: Self::NAME.to_string(),
                arguments: serde_json::to_value(&args)?,
                display_name: "✏️ Edit flashcard".to_string(),
                display_description_markdown: format!(
                    "**Question**: {}\n\n**Answer**: {}",
                    args.question, args.answer
                ),
                status: ToolCallStatus::Pending,
                file_id: Some(cell.file_id()),
            }),
        );

        emit_tool_called(&message, &self.0.on_event)?;
        self.0.messages_to_upsert.lock().await.push(message);
        Ok(
            "Edit request has been presented to the user for approval, do not repeat the edit."
                .to_string(),
        )
    }
}

pub struct AcceptEditFlashCardContent {
    cell_repository: Arc<dyn CellRepository>,
}

impl AcceptEditFlashCardContent {
    pub fn new(cell_repository: Arc<dyn CellRepository>) -> Self {
        Self { cell_repository }
    }
}

#[async_trait]
impl AcceptToolCall for AcceptEditFlashCardContent {
    type Args = EditFlashCardContentArgs;

    async fn accept_call(
        &self,
        _tool_call: &ToolCallDisplayContent,
        args: Self::Args,
    ) -> Result<(), AcceptToolCallError> {
        let cell_id = Guid::parse_str(&args.cell_id).map_err(|_| {
            AcceptToolCallError::MissingArguments(format!("Invalid cell id: {}", args.cell_id))
        })?;
        let mut cell = self.cell_repository.get_by_id(cell_id).await?;
        let new_content = serde_json::to_string(&FlashCard {
            question: markdown::to_html(&args.question),
            answer: markdown::to_html(&args.answer),
        })?;
        cell.set_content(new_content);
        self.cell_repository.update(&cell).await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicBool, Ordering};

    use chrono::Utc;
    use injector::{injector::Injector, register_scope};

    use crate::ai_integration::tools::AcceptToolCall;
    use crate::{
        ROOT_FOLDER_ID,
        ai_integration::entities::message::ToolCallStatus,
        cells::{
            dto::create_cell_request_dto::CreateCellRequestDto,
            entities::cell::CellType,
            repositories::{cell_repository::CellRepository, review_repository::ReviewRepository},
            services::{
                cell_creator::CellCreator,
                implementations::default_cell_creator::DefaultCellCreator,
            },
        },
        file_system::{
            entities::file::File,
            repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
            services::{
                implementations::default_item_creator::DefaultItemCreator,
                item_creator::{FileCreator, FolderCreator},
            },
            value_objects::{
                file_system_item_name::FileSystemItemName, fsrs_profile_choice::FsrsProfileChoice,
            },
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
        register_scope!(injector, dyn CellRepository, SqliteCellRepository);
        register_scope!(injector, dyn ReviewRepository, SqliteReviewRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn CellCreator, DefaultCellCreator);
        register_scope!(injector, dyn FolderCreator, DefaultItemCreator);
        register_scope!(injector, dyn FileCreator, DefaultItemCreator);
        injector
    }

    fn dummy_tool_call(file_id: Guid) -> ToolCallDisplayContent {
        ToolCallDisplayContent {
            id: "".to_string(),
            name: "".to_string(),
            arguments: serde_json::Value::Null,
            display_name: "".to_string(),
            display_description_markdown: "".to_string(),
            status: ToolCallStatus::Pending,
            file_id: Some(file_id),
        }
    }

    #[tokio::test]
    async fn call_valid_flashcard_cell_added_message_and_called_on_event() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            FileSystemItemName::new_unchecked("test".to_string()),
            FsrsProfileChoice::Inherit,
        );
        scope
            .resolve::<dyn FileRepository>()
            .await
            .create(&file)
            .await
            .unwrap();

        let cell_id = scope
            .resolve::<dyn CellCreator>()
            .await
            .create_cell(CreateCellRequestDto {
                file_id: file.id(),
                content: serde_json::to_string(&FlashCard {
                    question: "Old question".to_string(),
                    answer: "Old answer".to_string(),
                })
                .unwrap(),
                cell_type: CellType::FlashCard,
                index: 0,
            })
            .await
            .unwrap();

        let chat_id = Guid::new_v4();
        let messages_to_upsert = Arc::new(Mutex::new(Vec::new()));
        let received_on_event = Arc::new(AtomicBool::new(false));
        let received_on_event_clone = received_on_event.clone();

        let tool = EditFlashCardContent::new(
            chat_id,
            messages_to_upsert.clone(),
            Some(Arc::new(move |_| {
                received_on_event_clone.store(true, Ordering::Relaxed);
                Ok(())
            })),
            scope.resolve::<dyn CellRepository>().await,
        );

        // Act

        tool.call(EditFlashCardContentArgs {
            cell_id: cell_id.to_string(),
            question: "New question".to_string(),
            answer: "New answer".to_string(),
        })
        .await
        .unwrap();

        // Assert

        assert!(received_on_event.load(Ordering::Relaxed));
        let messages = messages_to_upsert.lock().await;
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].chat_id(), chat_id);

        if let MessageContent::ToolCallDisplay(display) = messages[0].content() {
            assert_eq!(display.name, EditFlashCardContent::NAME);
            assert_eq!(display.display_name, "✏️ Edit flashcard");
            assert_eq!(display.status, ToolCallStatus::Pending);
            assert_eq!(display.file_id, Some(file.id()));
        } else {
            panic!("Not correct message content");
        }
    }

    #[tokio::test]
    async fn call_invalid_cell_id_returns_invalid_cell_id_error() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();

        let tool = EditFlashCardContent::new(
            Guid::new_v4(),
            Arc::new(Mutex::new(Vec::new())),
            None,
            scope.resolve::<dyn CellRepository>().await,
        );

        // Act

        let result = tool
            .call(EditFlashCardContentArgs {
                cell_id: "not-a-valid-uuid".to_string(),
                question: "Q".to_string(),
                answer: "A".to_string(),
            })
            .await;

        // Assert

        assert!(matches!(
            result,
            Err(EditCellContentError::InvalidCellId(id)) if id == "not-a-valid-uuid"
        ));
    }

    #[tokio::test]
    async fn call_cell_not_found_returns_cell_not_found_error() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();

        let tool = EditFlashCardContent::new(
            Guid::new_v4(),
            Arc::new(Mutex::new(Vec::new())),
            None,
            scope.resolve::<dyn CellRepository>().await,
        );

        let missing_id = Guid::new_v4().to_string();

        // Act

        let result = tool
            .call(EditFlashCardContentArgs {
                cell_id: missing_id.clone(),
                question: "Q".to_string(),
                answer: "A".to_string(),
            })
            .await;

        // Assert

        assert!(matches!(
            result,
            Err(EditCellContentError::CellNotFound(id)) if id == missing_id
        ));
    }

    #[tokio::test]
    async fn accept_call_flashcard_updates_content() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();

        let file_id = scope
            .resolve::<dyn FileCreator>()
            .await
            .create_file(
                Some(ROOT_FOLDER_ID),
                FileSystemItemName::new_unchecked("Test".to_string()),
            )
            .await
            .unwrap();

        let cell_id = scope
            .resolve::<dyn CellCreator>()
            .await
            .create_cell(CreateCellRequestDto {
                file_id,
                content: serde_json::to_string(&FlashCard {
                    question: "Old question".to_string(),
                    answer: "Old answer".to_string(),
                })
                .unwrap(),
                cell_type: CellType::FlashCard,
                index: 0,
            })
            .await
            .unwrap();

        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let acceptor = AcceptEditFlashCardContent::new(cell_repository.clone());

        // Act

        acceptor
            .accept_call(
                &dummy_tool_call(file_id),
                EditFlashCardContentArgs {
                    cell_id: cell_id.to_string(),
                    question: "**New question**".to_string(),
                    answer: "New answer".to_string(),
                },
            )
            .await
            .unwrap();

        // Assert

        let updated_cell = cell_repository.get_by_id(cell_id).await.unwrap();
        assert_eq!(
            serde_json::to_string(&FlashCard {
                question: markdown::to_html("**New question**"),
                answer: markdown::to_html("New answer"),
            })
            .unwrap(),
            updated_cell.content()
        );
    }
}
