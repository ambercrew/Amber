use rig::providers::ollama;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[allow(clippy::large_enum_variant)]
pub enum MultiResponse {
    Ollama(ollama::CompletionResponse),
    #[cfg(test)]
    Mock,
}

impl From<ollama::CompletionResponse> for MultiResponse {
    fn from(value: ollama::CompletionResponse) -> Self {
        MultiResponse::Ollama(value)
    }
}
