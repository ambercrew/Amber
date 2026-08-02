use async_trait::async_trait;
use rig::agent::Agent;
use thiserror::Error;
use uuid::Uuid;

use crate::ai_integration::clients::multi_client::multi_completion_model::MultiCompletionModel;
use crate::ai_integration::entities::message::Message;
use crate::ai_integration::services::ai_client_provider::AiClientProviderError;

#[derive(Error, Debug)]
pub enum AgentProviderError {
    #[error(transparent)]
    AiClientProvider(#[from] AiClientProviderError),
}

#[async_trait]
pub trait AgentProvider: Send + Sync {
    async fn get_agent(
        &self,
        chat_id: Uuid,
        messages: &[Message],
    ) -> Result<Agent<MultiCompletionModel>, AgentProviderError>;
}
