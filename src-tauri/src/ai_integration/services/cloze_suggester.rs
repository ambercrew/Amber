use async_trait::async_trait;
use thiserror::Error;

use crate::ai_integration::services::ai_client_provider::AiClientProviderError;

#[derive(Error, Debug)]
pub enum ClozeSuggesterError {
    #[error(transparent)]
    AiClientProvider(#[from] AiClientProviderError),
    #[error("The cloze suggestion generation was cancelled.")]
    Cancelled,
    #[error("{0}")]
    Generation(String),
}

#[async_trait]
pub trait ClozeSuggester: Send + Sync {
    /// Asks the AI to wrap the given cell content in `<cloze index="N">...</cloze>`
    /// tags and returns the suggested content. The call can be cancelled through
    /// [`crate::ai_integration::ai_state::AiState::cancel_generation`].
    async fn suggest(&self, content: String) -> Result<String, ClozeSuggesterError>;
}
