use async_trait::async_trait;
use serde::Deserialize;
use serde_json::Value;
use thiserror::Error;

use crate::{
    ai_integration::entities::message::ToolCall, cells::cell_service::CellServiceError,
    common::repository_error::RepositoryError,
};

pub mod create_flash_card;

#[derive(Error, Debug)]
pub enum AcceptToolCallError {
    #[error("{0}")]
    UnknownRepositoryError(#[from] RepositoryError),
    #[error("{0}")]
    CellServiceError(#[from] CellServiceError),
    #[error("{0}")]
    ParsingError(#[from] serde_json::Error),
    #[error("{0}")]
    MissingArguments(String),
}

#[async_trait]
pub trait AcceptToolCall: Send + Sync {
    type Args: for<'a> Deserialize<'a> + Send + Sync;

    async fn accept_call(
        &self,
        tool_call: &ToolCall,
        args: Self::Args,
    ) -> Result<(), AcceptToolCallError>;
}

#[async_trait]
pub trait AcceptToolCallFromJson: Send + Sync {
    async fn accept_call(
        &self,
        tool_call: &ToolCall,
        value: Value,
    ) -> Result<(), AcceptToolCallError>;
}

#[async_trait]
impl<T: AcceptToolCall + Send + Sync> AcceptToolCallFromJson for T {
    async fn accept_call(
        &self,
        tool_call: &ToolCall,
        value: Value,
    ) -> Result<(), AcceptToolCallError> {
        let args = serde_json::from_value(value)?;
        <Self as AcceptToolCall>::accept_call(self, tool_call, args).await
    }
}
