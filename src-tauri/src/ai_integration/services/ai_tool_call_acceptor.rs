use async_trait::async_trait;
use thiserror::Error;

use crate::{
    Guid, ai_integration::tools::AcceptToolCallError, common::repository_error::RepositoryError,
};

#[derive(Error, Debug)]
pub enum AiToolCallAcceptorError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error("Unknown tool name")]
    UnknownToolName,
    #[error("Can only accept tool calls")]
    CanOnlyAcceptToolCalls,
    #[error(transparent)]
    AcceptToolCall(#[from] AcceptToolCallError),
}

#[async_trait]
pub trait AiToolCallAcceptor: Send + Sync {
    async fn accept_tool_call(&self, message_id: Guid) -> Result<(), AiToolCallAcceptorError>;
}
