use rig::{
    completion::GetTokenUsage,
    providers::{ollama, openai},
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub enum MultiStreamingResponse {
    Ollama(ollama::StreamingCompletionResponse),
    OpenAI(openai::StreamingCompletionResponse),
}

impl GetTokenUsage for MultiStreamingResponse {
    fn token_usage(&self) -> Option<rig::completion::Usage> {
        match self {
            Self::Ollama(response) => response.token_usage(),
            Self::OpenAI(response) => response.token_usage(),
        }
    }
}

impl From<ollama::StreamingCompletionResponse> for MultiStreamingResponse {
    fn from(value: ollama::StreamingCompletionResponse) -> Self {
        MultiStreamingResponse::Ollama(value)
    }
}

impl From<openai::StreamingCompletionResponse> for MultiStreamingResponse {
    fn from(value: openai::StreamingCompletionResponse) -> Self {
        MultiStreamingResponse::OpenAI(value)
    }
}
