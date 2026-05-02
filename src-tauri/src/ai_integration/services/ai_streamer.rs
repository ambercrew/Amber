use std::sync::Arc;

use async_trait::async_trait;
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
    #[error("An unkown error has happened: {0}")]
    Tauri(#[from] tauri::Error),
}

pub type OnEventCallback =
    Arc<dyn Send + Sync + Fn(StreamLlmResponseEvent) -> Result<(), OnEventCallbackError>>;

#[derive(Error, Debug)]
pub enum AiStreamerError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error("An error happened while creating the new chat")]
    CreateChat(#[source] SourceError),
    #[error(transparent)]
    AiClientProvider(#[from] AiClientProviderError),
    #[error(transparent)]
    OnEventCallback(#[from] OnEventCallbackError),
}

#[async_trait]
pub trait AiStreamer: Send + Sync {
    async fn stream(
        &self,
        request: StreamAiRequestDto,
        on_event: OnEventCallback,
    ) -> Result<(), AiStreamerError>;
}
