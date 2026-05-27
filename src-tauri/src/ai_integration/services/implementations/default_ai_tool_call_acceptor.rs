use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::Guid;
use crate::ai_integration::entities::message::MessageContent;
use crate::ai_integration::repositories::ai_repository::AiRepository;
use crate::ai_integration::services::ai_tool_call_acceptor::{
    AiToolCallAcceptor, AiToolCallAcceptorError,
};
use rig::tool::Tool;

use crate::ai_integration::entities::message::ToolCallStatus;
use crate::ai_integration::tools::AcceptToolCallFromJson;
use crate::ai_integration::tools::create_flash_card::{AcceptCreateFlashCard, CreateFlashCard};
use crate::cells::repositories::cell_repository::CellRepository;
use crate::cells::services::cell_creator::CellCreator;
#[derive(ScopeInjectable)]
pub struct DefaultAiToolCallAcceptor {
    ai_repository: Arc<dyn AiRepository>,
    cell_repository: Arc<dyn CellRepository>,
    cell_creator: Arc<dyn CellCreator>,
}

#[async_trait]
impl AiToolCallAcceptor for DefaultAiToolCallAcceptor {
    async fn accept_tool_call(&self, message_id: Guid) -> Result<(), AiToolCallAcceptorError> {
        let mut message = self.ai_repository.get_message_by_id(message_id).await?;
        let tool_call = match message.content_mut() {
            MessageContent::ToolCallDisplay(tool_call) => tool_call,
            _ => return Err(AiToolCallAcceptorError::CanOnlyAcceptToolCalls),
        };

        #[allow(clippy::needless_late_init)]
        let tool: Box<dyn AcceptToolCallFromJson>;

        if tool_call.name == CreateFlashCard::NAME {
            tool = Box::new(AcceptCreateFlashCard::new(
                self.cell_repository.clone(),
                self.cell_creator.clone(),
            ));
        } else {
            return Err(AiToolCallAcceptorError::UnknownToolName);
        }

        tool.accept_call(tool_call, tool_call.arguments.clone())
            .await?;

        tool_call.status = ToolCallStatus::Accepted;
        self.ai_repository.upsert_message(&message).await?;

        Ok(())
    }
}

#[cfg(test)]
pub mod tests {
    use injector::{injector::Injector, register_scope};

    use crate::{
        Guid, ROOT_FOLDER_ID,
        ai_integration::{
            entities::{
                chat::Chat,
                message::{Message, MessageContent, ToolCallDisplayContent, ToolCallStatus},
            },
            repositories::ai_repository::AiRepository,
            services::ai_tool_call_acceptor::AiToolCallAcceptor,
            tools::create_flash_card::{CreateFlashCard, CreateFlashcardArgs},
        },
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
            sqlite_ai_repository::SqliteAiRepository, sqlite_cell_repository::SqliteCellRepository,
            sqlite_file_repository::SqliteFileRepository,
            sqlite_folder_repository::SqliteFolderRepository,
            sqlite_review_repository::SqliteReviewRepository,
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;

        register_scope!(injector, dyn AiRepository, SqliteAiRepository);
        register_scope!(injector, dyn CellRepository, SqliteCellRepository);
        register_scope!(injector, dyn ReviewRepository, SqliteReviewRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn CellCreator, DefaultCellCreator);
        register_scope!(injector, dyn FolderCreator, DefaultItemCreator);
        register_scope!(injector, dyn FileCreator, DefaultItemCreator);
        register_scope!(injector, DefaultAiToolCallAcceptor);

        injector
    }

    #[tokio::test]
    pub async fn accept_tool_call_create_flashcard_called_correctly_and_updated_status() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultAiToolCallAcceptor>().await;

        let ai_repository = scope.resolve::<dyn AiRepository>().await;
        let chat_id = Guid::new_v4();
        ai_repository
            .upsert_chat(&Chat::new(Some(chat_id), "test".to_string()))
            .await
            .unwrap();

        let file_id = scope
            .resolve::<dyn FileCreator>()
            .await
            .create_file(
                Some(ROOT_FOLDER_ID),
                FileSystemItemName::new_unchecked("Test".to_string()),
            )
            .await
            .unwrap();

        let args = CreateFlashcardArgs {
            file_id: file_id.to_string(),
            question: "**Question**".to_string(),
            answer: "Answer".to_string(),
        };

        let message_id = Guid::new_v4();
        ai_repository
            .upsert_message(&Message::new(
                Some(message_id),
                chat_id,
                MessageContent::ToolCallDisplay(ToolCallDisplayContent {
                    id: "".to_string(),
                    name: CreateFlashCard::NAME.to_string(),
                    arguments: serde_json::to_value(args.clone()).unwrap(),
                    display_name: "".to_string(),
                    display_description_markdown: "".to_string(),
                    status: ToolCallStatus::Pending,
                    file_id: Some(file_id),
                }),
            ))
            .await
            .unwrap();

        // Act

        service.accept_tool_call(message_id).await.unwrap();

        // Assert

        let cells = scope
            .resolve::<dyn CellRepository>()
            .await
            .get_file_cells_ordered_by_index(file_id)
            .await
            .unwrap();
        assert_eq!(1, cells.len());

        let actual_message = scope
            .resolve::<dyn AiRepository>()
            .await
            .get_message_by_id(message_id)
            .await
            .unwrap();

        if let MessageContent::ToolCallDisplay(tool_call) = actual_message.content() {
            assert_eq!(ToolCallStatus::Accepted, tool_call.status);
        } else {
            panic!();
        }
    }
}
