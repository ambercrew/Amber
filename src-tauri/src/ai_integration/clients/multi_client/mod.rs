pub mod multi_completion_model;
pub mod multi_embedding_model;
pub mod multi_response;
pub mod multi_streaming_response;

use rig::client::{CompletionClient, EmbeddingsClient};

#[cfg(not(test))]
use rig::providers::ollama;
#[cfg(not(test))]
use rig::providers::openai;

#[cfg(test)]
use crate::ai_integration::clients::mock_client::MockClient;
use crate::ai_integration::clients::multi_client::{
    multi_completion_model::MultiCompletionModel, multi_embedding_model::MultiEmbeddingModel,
};

/// Used for enum dispatching from multiple models.
pub enum MultiClient {
    #[cfg(not(test))]
    Ollama(ollama::Client),
    #[cfg(not(test))]
    OpenAI(openai::CompletionsClient),
    #[cfg(test)]
    Mock(MockClient),
}

impl CompletionClient for MultiClient {
    type CompletionModel = MultiCompletionModel;
}

impl EmbeddingsClient for MultiClient {
    type EmbeddingModel = MultiEmbeddingModel;

    fn embedding_model(&self, model: impl Into<String>) -> Self::EmbeddingModel {
        match self {
            #[cfg(not(test))]
            MultiClient::Ollama(client) => {
                // NOTE: Ollama does not retrieve the number of dimensions dynamically, so hard
                // coding 2560!
                MultiEmbeddingModel::Ollama(client.embedding_model_with_ndims(model, 2560))
            }
            #[cfg(not(test))]
            MultiClient::OpenAI(client) => {
                MultiEmbeddingModel::OpenAI(client.embedding_model(model))
            }
            #[cfg(test)]
            MultiClient::Mock(client) => {
                let mut client = client.clone();
                client.embeddings_model = Some(model.into());
                client.embeddings_model_dims = None;
                MultiEmbeddingModel::Mock(client)
            }
        }
    }

    fn embedding_model_with_ndims(
        &self,
        model: impl Into<String>,
        ndims: usize,
    ) -> Self::EmbeddingModel {
        match self {
            #[cfg(not(test))]
            MultiClient::Ollama(client) => {
                MultiEmbeddingModel::Ollama(client.embedding_model_with_ndims(model, ndims))
            }
            #[cfg(not(test))]
            MultiClient::OpenAI(client) => {
                MultiEmbeddingModel::OpenAI(client.embedding_model_with_ndims(model, ndims))
            }
            #[cfg(test)]
            MultiClient::Mock(client) => {
                let mut client = client.clone();
                client.embeddings_model_dims = Some(ndims);
                client.embeddings_model = Some(model.into());
                MultiEmbeddingModel::Mock(client)
            }
        }
    }
}
