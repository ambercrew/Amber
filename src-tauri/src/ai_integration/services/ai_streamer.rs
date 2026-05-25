use std::sync::Arc;

use async_trait::async_trait;
use rig::{completion::CompletionError, http_client::Error as HttpClientError};
use serde::Serialize;
use thiserror::Error;

use crate::{
    SourceError,
    ai_integration::{
        dto::stream_ai_request_dto::StreamAiRequestDto,
        entities::{chat::Chat, message::Message},
        services::ai_client_provider::AiClientProviderError,
    },
    common::repository_error::RepositoryError,
};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum StreamLlmResponseEvent {
    CreatedChat(Chat),
    InProgress(String),
    ToolCalled(Message),
    Error(String),
}

#[derive(Error, Debug)]
pub enum OnEventCallbackError {
    #[error("An unknown error occurred: {0}")]
    Tauri(#[from] tauri::Error),
}

pub type OnEventCallback =
    Arc<dyn Send + Sync + Fn(StreamLlmResponseEvent) -> Result<(), OnEventCallbackError>>;

#[derive(Error, Debug)]
pub enum AiStreamerError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error("Failed to create the chat: {0}")]
    CreateChat(#[source] SourceError),
    #[error("HTTP {status}: {message}")]
    ProviderHttpError { status: u16, message: String },
    #[error("{0}")]
    ProviderError(String),
    #[error(transparent)]
    AiClientProvider(#[from] AiClientProviderError),
    #[error(transparent)]
    OnEventCallback(#[from] OnEventCallbackError),
}

impl TryFrom<CompletionError> for AiStreamerError {
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
                Ok(AiStreamerError::ProviderHttpError {
                    status: status.as_u16(),
                    message,
                })
            }
            CompletionError::ProviderError(message) => Ok(AiStreamerError::ProviderError(message)),
            other => Err(other),
        }
    }
}

#[async_trait]
pub trait AiStreamer: Send + Sync {
    async fn stream(
        &self,
        request: StreamAiRequestDto,
        on_event: OnEventCallback,
    ) -> Result<(), AiStreamerError>;
}
