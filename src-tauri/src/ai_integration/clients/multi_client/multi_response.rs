#[cfg(not(test))]
use rig::providers::{ollama, openai};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[allow(clippy::large_enum_variant)]
pub enum MultiResponse {
    #[cfg(not(test))]
    Ollama(ollama::CompletionResponse),
    #[cfg(not(test))]
    OpenAI(openai::CompletionResponse),
    #[cfg(test)]
    Mock,
}

#[cfg(not(test))]
impl From<ollama::CompletionResponse> for MultiResponse {
    fn from(value: ollama::CompletionResponse) -> Self {
        MultiResponse::Ollama(value)
    }
}

#[cfg(not(test))]
impl From<openai::CompletionResponse> for MultiResponse {
    fn from(value: openai::CompletionResponse) -> Self {
        MultiResponse::OpenAI(value)
    }
}
