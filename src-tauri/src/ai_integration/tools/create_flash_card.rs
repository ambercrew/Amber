use std::sync::Arc;

use async_trait::async_trait;
use rig::{completion::ToolDefinition, tool::Tool};
use schemars::schema_for;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::sync::Mutex;

use crate::{
    Guid,
    ai_integration::{
        ai_service::{OnEventCallback, StreamLlmResponseEvent},
        entities::message::{Message, MessageContent, ToolCallContent, ToolCallStatus},
        tools::{AcceptToolCall, AcceptToolCallError},
    },
    cells::{
        cell_service::CellService, entities::cell::CellType, models::flash_card::FlashCard,
        repositories::cell_repository::CellRepository,
    },
    common::repository_error::RepositoryError,
};

#[derive(Deserialize, Debug, Clone, Serialize, schemars::JsonSchema)]
pub struct CreateFlashcardArgs {
    #[schemars(description = "The question shown to the user.'")]
    pub question: String,
    #[schemars(
        description = "The correct answer. Must be as concise as possible — a word, phrase, or single sentence."
    )]
    pub answer: String,
}

#[derive(Error, Debug)]
pub enum CreateFlashCardError {
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error("{0}")]
    OnEvent(String),
}

pub struct CreateFlashCard {
    file_id: Guid,
    chat_id: Guid,
    messages_to_upsert: Arc<Mutex<Vec<Message>>>,
    on_event: Option<OnEventCallback>,
}

impl CreateFlashCard {
    pub fn new(
        file_id: Guid,
        chat_id: Guid,
        messages_to_upsert: Arc<Mutex<Vec<Message>>>,
        on_event: Option<OnEventCallback>,
    ) -> Self {
        Self {
            file_id,
            chat_id,
            messages_to_upsert,
            on_event,
        }
    }
}

impl Tool for CreateFlashCard {
    const NAME: &'static str = "create_flashcard";

    type Error = CreateFlashCardError;
    type Args = CreateFlashcardArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let parameters = serde_json::to_value(schema_for!(CreateFlashcardArgs)).unwrap();

        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Creates a single flashcard and adds it to the user's deck. \
                Call this tool once per card — never batch multiple facts into one call."
                .to_string(),
            parameters,
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let mut messages_to_upsert = self.messages_to_upsert.lock().await;
        let message = Message::new(
            None,
            self.chat_id,
            MessageContent::ToolCall(ToolCallContent {
                id: Guid::new_v4().to_string(),
                name: Self::NAME.to_string(),
                display_name: "📝 Create flashcard".to_string(),
                display_description_markdown: format!(
                    "\
                        **Question**: {}

\
                        **Answer**: {}",
                    args.question, args.answer
                )
                .to_string(),
                arguments: serde_json::to_value(&args)?,
                status: ToolCallStatus::Pending,
                file_id: Some(self.file_id),
            }),
        );

        if let Some(on_event) = self.on_event.as_ref()
            && let Err(err) = on_event(StreamLlmResponseEvent::ToolCalled(message.clone()))
        {
            return Err(CreateFlashCardError::OnEvent(err));
        }

        messages_to_upsert.push(message);
        Ok("Request to create the flashcard has been presented to the user, please do not repeat the flash cards.".to_string())
    }
}

pub struct AcceptCreateFlashCard {
    cell_repository: Arc<dyn CellRepository>,
    cell_service: Arc<CellService>,
}

impl AcceptCreateFlashCard {
    pub fn new(cell_repository: Arc<dyn CellRepository>, cell_service: Arc<CellService>) -> Self {
        Self {
            cell_repository,
            cell_service,
        }
    }
}

#[async_trait]
impl AcceptToolCall for AcceptCreateFlashCard {
    type Args = CreateFlashcardArgs;

    async fn accept_call(
        &self,
        tool_call: &ToolCallContent,
        args: Self::Args,
    ) -> Result<(), AcceptToolCallError> {
        let file_id = match tool_call.file_id {
            Some(file_id) => file_id,
            None => {
                return Err(AcceptToolCallError::MissingArguments(
                    "Missing file id!".to_string(),
                ));
            }
        };

        let cell_index = self
            .cell_repository
            .get_number_of_cells_in_file(file_id)
            .await?;

        let flash_card = serde_json::to_string(&FlashCard {
            question: markdown::to_html(&args.question),
            answer: markdown::to_html(&args.answer),
        })?;

        log::info!(
            "Creating flash card with the following content {:?}",
            flash_card
        );

        self.cell_service
            .create_cell(file_id, flash_card, CellType::FlashCard, cell_index)
            .await?;

        Ok(())
    }
}

#[cfg(test)]
pub mod create_flash_card_test {
    use std::sync::atomic::{AtomicBool, Ordering};

    use super::*;

    #[tokio::test]
    pub async fn call_valid_input_added_message_and_called_on_event() {
        // Arrange

        let file_id = Guid::new_v4();
        let chat_id = Guid::new_v4();
        let messages_to_upsert = Arc::new(Mutex::new(Vec::new()));

        let received_on_event = Arc::new(AtomicBool::new(false));
        let received_on_event_clone = received_on_event.clone();

        let create_flash_card = CreateFlashCard::new(
            file_id,
            chat_id,
            messages_to_upsert.clone(),
            Some(Arc::new(move |_| {
                received_on_event_clone.store(true, Ordering::Relaxed);
                Ok(())
            })),
        );

        let args = CreateFlashcardArgs {
            question: "Question".to_string(),
            answer: "Answer".to_string(),
        };

        // Act

        create_flash_card.call(args.clone()).await.unwrap();

        // Assert

        assert!(received_on_event.load(Ordering::Relaxed));
        let messages_to_upsert = messages_to_upsert.lock().await;
        assert_eq!(messages_to_upsert.len(), 1);
        assert_eq!(messages_to_upsert[0].chat_id(), chat_id);

        if let MessageContent::ToolCall(tool_call) = messages_to_upsert[0].content() {
            assert_eq!(tool_call.name, CreateFlashCard::NAME);
            assert_eq!(tool_call.display_name, "📝 Create flashcard".to_string());
            assert_eq!(
                tool_call.display_description_markdown,
                "\
                        **Question**: Question

\
                        **Answer**: Answer"
                    .to_string()
            );
            assert_eq!(tool_call.arguments, serde_json::to_value(args).unwrap());
            assert_eq!(tool_call.status, ToolCallStatus::Pending);
            assert_eq!(tool_call.file_id, Some(file_id));
        } else {
            panic!("Not correct message content");
        }
    }
}

#[cfg(test)]
pub mod accept_create_flash_card_test {
    use injector::{injector::Injector, register_scope};

    use crate::{
        ROOT_FOLDER_ID,
        cells::repositories::review_repository::ReviewRepository,
        file_system::{
            file_system_service::FileSystemService,
            repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
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

        register_scope!(injector, dyn CellRepository, SqliteCellRepository);
        register_scope!(injector, dyn ReviewRepository, SqliteReviewRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, CellService);
        register_scope!(injector, FileSystemService);

        injector
    }

    #[tokio::test]
    pub async fn accept_call_valid_input_added_flash_cards() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();

        let file_id = scope
            .resolve::<FileSystemService>()
            .await
            .create_file(
                Some(ROOT_FOLDER_ID),
                FileSystemItemName::new_unchecked("Test".to_string()),
            )
            .await
            .unwrap();

        let cell_service = scope.resolve::<CellService>().await;
        cell_service
            .create_cell(file_id, "".to_string(), CellType::Note, 0)
            .await
            .unwrap();
        cell_service
            .create_cell(file_id, "".to_string(), CellType::Note, 1)
            .await
            .unwrap();

        let cell_repository = scope.resolve::<dyn CellRepository>().await;

        let args = CreateFlashcardArgs {
            question: "**Question**".to_string(),
            answer: "Answer".to_string(),
        };
        let accept_create_flash_card = AcceptCreateFlashCard {
            cell_repository: cell_repository.clone(),
            cell_service,
        };

        // Act

        accept_create_flash_card
            .accept_call(
                &ToolCallContent {
                    id: "".to_string(),
                    name: "".to_string(),
                    display_name: "".to_string(),
                    display_description_markdown: "".to_string(),
                    arguments: serde_json::to_value(args.clone()).unwrap(),
                    status: ToolCallStatus::Pending,
                    file_id: Some(file_id),
                },
                args,
            )
            .await
            .unwrap();

        // Assert

        let cells = cell_repository
            .get_file_cells_ordered_by_index(file_id)
            .await
            .unwrap();

        assert_eq!(3, cells.len());
        assert_eq!(&CellType::FlashCard, cells[2].cell_type());
        assert_eq!(
            serde_json::to_string(&FlashCard {
                question: "<p><strong>Question</strong></p>".to_string(),
                answer: "<p>Answer</p>".to_string(),
            })
            .unwrap(),
            cells[2].content()
        );
        assert_eq!(2, cells[2].index());
    }
}
