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
    cells::{
        repositories::cell_repository::CellRepository,
        services::cell_content_updater::CellContentUpdater, value_objects::true_false::TrueFalse,
    },
};

use super::{EditCellContentError, EditToolState, emit_tool_called, fetch_cell, parse_cell_id};

#[derive(Deserialize, Debug, Clone, Serialize, schemars::JsonSchema)]
pub struct EditTrueFalseContentArgs {
    #[schemars(description = "The ID of the true/false cell to edit")]
    pub cell_id: String,
    #[schemars(
        description = "The statement to evaluate as true or false. Use markdown, not HTML."
    )]
    pub question: String,
    #[serde(rename = "isTrue")]
    #[schemars(description = "Whether the statement is true")]
    pub is_true: bool,
}

pub struct EditTrueFalseContent(EditToolState);

impl EditTrueFalseContent {
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

impl Tool for EditTrueFalseContent {
    const NAME: &'static str = "edit_true_false_content";

    type Error = EditCellContentError;
    type Args = EditTrueFalseContentArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Edits the statement and truth value of an existing true/false cell. \
                Use this when the user asks to change, reword, fix, or improve a true/false card."
                .to_string(),
            parameters: serde_json::to_value(schema_for!(EditTrueFalseContentArgs)).unwrap(),
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
                display_name: "✏️ Edit true/false".to_string(),
                display_description_markdown: format!(
                    "**Statement**: {}\n\n**Is true**: {}",
                    args.question, args.is_true
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

pub struct AcceptEditTrueFalseContent {
    cell_content_updater: Arc<dyn CellContentUpdater>,
}

impl AcceptEditTrueFalseContent {
    pub fn new(cell_content_updater: Arc<dyn CellContentUpdater>) -> Self {
        Self {
            cell_content_updater,
        }
    }
}

#[async_trait]
impl AcceptToolCall for AcceptEditTrueFalseContent {
    type Args = EditTrueFalseContentArgs;

    async fn accept_call(
        &self,
        _tool_call: &ToolCallDisplayContent,
        args: Self::Args,
    ) -> Result<(), AcceptToolCallError> {
        let cell_id = Guid::parse_str(&args.cell_id).map_err(|_| {
            AcceptToolCallError::MissingArguments(format!("Invalid cell id: {}", args.cell_id))
        })?;
        let new_content = serde_json::to_string(&TrueFalse {
            question: markdown::to_html(&args.question),
            is_true: args.is_true,
        })?;
        self.cell_content_updater
            .update_cell_content(cell_id, new_content)
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
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
                cell_content_updater::CellContentUpdater,
                cell_creator::CellCreator,
                implementations::{
                    default_cell_content_updater::DefaultCellContentUpdater,
                    default_cell_creator::DefaultCellCreator,
                },
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
        incremental_reading::{
            extracts::repositories::extract_repository::ExtractRepository,
            scheduling::repositories::incremental_reading_schedule_repository::IncrementalReadingScheduleRepository,
        },
        infrastructure::repositories::sqlite::{
            sqlite_cell_repository::SqliteCellRepository,
            sqlite_extract_repository::SqliteExtractRepository,
            sqlite_file_repository::SqliteFileRepository,
            sqlite_folder_repository::SqliteFolderRepository,
            sqlite_incremental_reading_schedule_repository::SqliteIncrementalReadingScheduleRepository,
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
        register_scope!(injector, dyn ExtractRepository, SqliteExtractRepository);
        register_scope!(
            injector,
            dyn IncrementalReadingScheduleRepository,
            SqliteIncrementalReadingScheduleRepository
        );
        register_scope!(injector, dyn CellCreator, DefaultCellCreator);
        register_scope!(injector, dyn CellContentUpdater, DefaultCellContentUpdater);
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
    async fn accept_call_true_false_updates_content() {
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
                content: serde_json::to_string(&TrueFalse {
                    question: "Old statement".to_string(),
                    is_true: true,
                })
                .unwrap(),
                cell_type: CellType::TrueFalse,
                index: 0,
            })
            .await
            .unwrap();

        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let cell_content_updater = scope.resolve::<dyn CellContentUpdater>().await;
        let acceptor = AcceptEditTrueFalseContent::new(cell_content_updater);

        // Act

        acceptor
            .accept_call(
                &dummy_tool_call(file_id),
                EditTrueFalseContentArgs {
                    cell_id: cell_id.to_string(),
                    question: "New statement".to_string(),
                    is_true: false,
                },
            )
            .await
            .unwrap();

        // Assert

        let updated_cell = cell_repository.get_by_id(cell_id).await.unwrap();
        assert_eq!(
            serde_json::to_string(&TrueFalse {
                question: markdown::to_html("New statement"),
                is_true: false,
            })
            .unwrap(),
            updated_cell.content()
        );
    }
}
