use std::sync::Arc;

use thiserror::Error;
use tokio::sync::Mutex;

use crate::{
    Guid,
    ai_integration::{
        entities::message::Message,
        services::ai_streamer::{OnEventCallback, OnEventCallbackError, StreamLlmResponseEvent},
    },
    cells::{entities::cell::Cell, repositories::cell_repository::CellRepository},
    common::repository_error::RepositoryError,
};

pub mod cloze;
pub mod flash_card;
pub mod true_false;

pub use cloze::{AcceptEditClozeContent, EditClozeContent};
pub use flash_card::{AcceptEditFlashCardContent, EditFlashCardContent};
pub use true_false::{AcceptEditTrueFalseContent, EditTrueFalseContent};

#[derive(Error, Debug)]
pub enum EditCellContentError {
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error(transparent)]
    OnEventCallback(#[from] OnEventCallbackError),
    #[error("'{0}' is not a valid cell id — must be a UUID")]
    InvalidCellId(String),
    #[error("No cell found with id '{0}'")]
    CellNotFound(String),
}

pub(super) fn parse_cell_id(raw: &str) -> Result<Guid, EditCellContentError> {
    Guid::parse_str(raw).map_err(|_| EditCellContentError::InvalidCellId(raw.to_string()))
}

pub(super) async fn fetch_cell(
    cell_repository: &Arc<dyn CellRepository>,
    raw_id: &str,
    cell_id: Guid,
) -> Result<Cell, EditCellContentError> {
    cell_repository
        .get_by_id(cell_id)
        .await
        .map_err(|e| match e {
            RepositoryError::NotFound(_) => EditCellContentError::CellNotFound(raw_id.to_string()),
            other => EditCellContentError::Repository(other),
        })
}

pub(super) fn emit_tool_called(
    message: &Message,
    on_event: &Option<OnEventCallback>,
) -> Result<(), EditCellContentError> {
    if let Some(cb) = on_event.as_ref() {
        cb(StreamLlmResponseEvent::ToolCalled(message.clone()))?;
    }
    Ok(())
}

pub(super) struct EditToolState {
    pub chat_id: Guid,
    pub messages_to_upsert: Arc<Mutex<Vec<Message>>>,
    pub on_event: Option<OnEventCallback>,
    pub cell_repository: Arc<dyn CellRepository>,
}

impl EditToolState {
    pub fn new(
        chat_id: Guid,
        messages_to_upsert: Arc<Mutex<Vec<Message>>>,
        on_event: Option<OnEventCallback>,
        cell_repository: Arc<dyn CellRepository>,
    ) -> Self {
        Self {
            chat_id,
            messages_to_upsert,
            on_event,
            cell_repository,
        }
    }
}
