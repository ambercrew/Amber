use async_trait::async_trait;
use rig::vector_store::VectorStoreError;
use rig_sqlite::SqliteVectorStore;
use thiserror::Error;

use crate::SourceError;
use crate::ai_integration::clients::multi_client::MultiClient;
use crate::ai_integration::clients::multi_client::multi_embedding_model::MultiEmbeddingModel;
use crate::ai_integration::entities::document::Document;

#[derive(Error, Debug)]
pub enum AiClientProviderError {
    #[error("AI is not enabled in settings!")]
    AiNotEnabled,
    #[cfg(not(test))]
    #[error("Ollama model name is not set in settings!")]
    OllamaModelNameIsNotFilled,
    #[cfg(not(test))]
    #[error("Ollama embeddings model name is not set in settings!")]
    OllamaEmbeddingsModelNameIsNotFilled,
    #[cfg(not(test))]
    #[error("OpenAI API key is not set in settings!")]
    OpenAIApiKeyNotSet,
    #[cfg(not(test))]
    #[error("OpenAI model name is not set in settings!")]
    OpenAIModelNameIsNotFilled,
    #[cfg(not(test))]
    #[error("OpenAI embeddings model name is not set in settings!")]
    OpenAIEmbeddingsModelNameIsNotFilled,
    #[error("Failed to connect to the embeddings database")]
    ConnectingToEmbeddingsDatabase(#[source] SourceError),
    #[error(transparent)]
    VectorStore(#[from] VectorStoreError),
    #[error("Failed to create vector store directory.")]
    CreateVectorStoreDirectory(#[source] SourceError),
    #[cfg(not(test))]
    #[error("Failed to create the client")]
    CreateClient,
}

#[async_trait]
pub trait AiClientProvider: Send + Sync {
    async fn get_client(&self) -> Result<MultiClient, AiClientProviderError>;
    async fn get_completion_model_name(&self) -> Result<String, AiClientProviderError>;
    async fn get_embeddings_model_name(&self) -> Result<String, AiClientProviderError>;
    async fn get_vector_store(
        &self,
        embed_model: &MultiEmbeddingModel,
    ) -> Result<SqliteVectorStore<MultiEmbeddingModel, Document>, AiClientProviderError>;
}
