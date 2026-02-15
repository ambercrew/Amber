pub mod multi_completion_model;
pub mod multi_response;
pub mod multi_streaming_response;

use rig::client::CompletionClient;

#[cfg(not(test))]
use rig::providers::ollama;

#[cfg(test)]
use crate::ai_integration::clients::mock_client::MockClient;
use crate::ai_integration::clients::multi_completion_client::multi_completion_model::MultiCompletionModel;

/// Used for enum dispatching from multiple models.
pub enum MultiCompletionClient {
    #[cfg(not(test))]
    Ollama(ollama::Client),
    #[cfg(test)]
    Mock(MockClient),
}

impl CompletionClient for MultiCompletionClient {
    type CompletionModel = MultiCompletionModel;
}
