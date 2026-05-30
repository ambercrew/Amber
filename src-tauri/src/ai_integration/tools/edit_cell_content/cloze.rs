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
    cells::repositories::cell_repository::CellRepository,
};

use super::{EditCellContentError, EditToolState, emit_tool_called, fetch_cell, parse_cell_id};

#[derive(Deserialize, Debug, Clone, Serialize, schemars::JsonSchema)]
pub struct EditClozeContentArgs {
    #[schemars(description = "The ID of the cloze cell to edit")]
    pub cell_id: String,
    #[schemars(
        description = "The full content with <cloze index=\"N\">...</cloze> tags wrapping each cloze group, where N is the group number starting at 1"
    )]
    pub content: String,
}

pub struct EditClozeContent(EditToolState);

impl EditClozeContent {
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

impl Tool for EditClozeContent {
    const NAME: &'static str = "edit_cloze_content";

    type Error = EditCellContentError;
    type Args = EditClozeContentArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Edits the content of an existing cloze cell, including the cloze tags. \
                Use this when the user asks to change, reword, fix, or improve a cloze card."
                .to_string(),
            parameters: serde_json::to_value(schema_for!(EditClozeContentArgs)).unwrap(),
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
                display_name: "✏️ Edit cloze".to_string(),
                display_description_markdown: format!("**Content**: {}", args.content),
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

pub struct AcceptEditClozeContent {
    cell_repository: Arc<dyn CellRepository>,
}

impl AcceptEditClozeContent {
    pub fn new(cell_repository: Arc<dyn CellRepository>) -> Self {
        Self { cell_repository }
    }
}

#[async_trait]
impl AcceptToolCall for AcceptEditClozeContent {
    type Args = EditClozeContentArgs;

    async fn accept_call(
        &self,
        _tool_call: &ToolCallDisplayContent,
        args: Self::Args,
    ) -> Result<(), AcceptToolCallError> {
        let cell_id = Guid::parse_str(&args.cell_id).map_err(|_| {
            AcceptToolCallError::MissingArguments(format!("Invalid cell id: {}", args.cell_id))
        })?;
        let mut cell = self.cell_repository.get_by_id(cell_id).await?;
        cell.set_content(args.content);
        self.cell_repository.update(&cell).await?;
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
    async fn accept_call_cloze_updates_content() {
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
                content: r#"<cloze index="1">Old text</cloze>"#.to_string(),
                cell_type: CellType::Cloze,
                index: 0,
            })
            .await
            .unwrap();

        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let acceptor = AcceptEditClozeContent::new(cell_repository.clone());

        let new_content =
            r#"<cloze index="1">New text</cloze> and <cloze index="2">more</cloze>"#.to_string();

        // Act

        acceptor
            .accept_call(
                &dummy_tool_call(file_id),
                EditClozeContentArgs {
                    cell_id: cell_id.to_string(),
                    content: new_content.clone(),
                },
            )
            .await
            .unwrap();

        // Assert

        let updated_cell = cell_repository.get_by_id(cell_id).await.unwrap();
        assert_eq!(new_content, updated_cell.content());
        assert_eq!(2, updated_cell.repetitions().len());
    }
}
