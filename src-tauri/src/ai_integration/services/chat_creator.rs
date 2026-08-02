use async_trait::async_trait;
use rig::completion::CompletionError;
use rig::http_client::Error as HttpClientError;
use thiserror::Error;

use crate::SourceError;
use crate::ai_integration::entities::chat::Chat;
use crate::ai_integration::services::ai_client_provider::AiClientProviderError;

#[derive(Error, Debug)]
pub enum ChatCreatorError {
    #[error(transparent)]
    AiClientProvider(#[from] AiClientProviderError),
    #[error("HTTP {status}: {message}")]
    ProviderHttpError { status: u16, message: String },
    #[error("{0}")]
    ProviderError(String),
    #[error("Failed to create the chat: {0}")]
    CreateChat(#[source] SourceError),
}

impl TryFrom<CompletionError> for ChatCreatorError {
    type Error = CompletionError;

    fn try_from(err: CompletionError) -> Result<Self, Self::Error> {
        match err {
            CompletionError::HttpError(HttpClientError::InvalidStatusCodeWithMessage(
                status,
                body,
            )) => {
                let message = serde_json::from_str::<serde_json::Value>(&body)
                    .ok()
                    .and_then(|v| v["error"]["message"].as_str().map(String::from))
                    .unwrap_or(body);
                Ok(ChatCreatorError::ProviderHttpError {
                    status: status.as_u16(),
                    message,
                })
            }
            CompletionError::ProviderError(message) => Ok(ChatCreatorError::ProviderError(message)),
            other => Err(other),
        }
    }
}

#[async_trait]
pub trait ChatCreator: Send + Sync {
    async fn create_chat(&self, prompt: &str) -> Result<Chat, ChatCreatorError>;
}
