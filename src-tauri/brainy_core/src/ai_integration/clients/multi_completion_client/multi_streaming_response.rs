use rig::{completion::GetTokenUsage, providers::ollama};
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize, Debug)]
pub enum MultiStreamingResponse {
    Ollama(ollama::StreamingCompletionResponse),
}

impl GetTokenUsage for MultiStreamingResponse {
    fn token_usage(&self) -> Option<rig::completion::Usage> {
        match self {
            Self::Ollama(response) => response.token_usage(),
        }
    }
}

impl From<ollama::StreamingCompletionResponse> for MultiStreamingResponse {
    fn from(value: ollama::StreamingCompletionResponse) -> Self {
        MultiStreamingResponse::Ollama(value)
    }
}
