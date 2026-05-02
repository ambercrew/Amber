use async_trait::async_trait;
use serde::Deserialize;
use serde_json::Value;
use thiserror::Error;

use crate::{
    ai_integration::entities::message::ToolCallContent,
    cells::services::cell_creator::CellCreatorError, common::repository_error::RepositoryError,
};

pub mod create_flash_card;
pub mod search_documents;

#[derive(Error, Debug)]
pub enum AcceptToolCallError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error(transparent)]
    CellCreator(#[from] CellCreatorError),
    #[error(transparent)]
    Parsing(#[from] serde_json::Error),
    #[error("{0}")]
    MissingArguments(String),
}

#[async_trait]
pub trait AcceptToolCall: Send + Sync {
    type Args: for<'a> Deserialize<'a> + Send + Sync;

    async fn accept_call(
        &self,
        tool_call: &ToolCallContent,
        args: Self::Args,
    ) -> Result<(), AcceptToolCallError>;
}

#[async_trait]
pub trait AcceptToolCallFromJson: Send + Sync {
    async fn accept_call(
        &self,
        tool_call: &ToolCallContent,
        value: Value,
    ) -> Result<(), AcceptToolCallError>;
}

#[async_trait]
impl<T: AcceptToolCall + Send + Sync> AcceptToolCallFromJson for T {
    async fn accept_call(
        &self,
        tool_call: &ToolCallContent,
        value: Value,
    ) -> Result<(), AcceptToolCallError> {
        let args = serde_json::from_value(value)?;
        <Self as AcceptToolCall>::accept_call(self, tool_call, args).await
    }
}
