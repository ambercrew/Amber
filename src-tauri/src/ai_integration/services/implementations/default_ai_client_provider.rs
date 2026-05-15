use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
#[cfg(not(test))]
use rig::client::{Nothing, ProviderClient};
#[cfg(not(test))]
use rig::providers::ollama;
use rig_sqlite::SqliteVectorStore;
use tokio_rusqlite::Connection;

#[cfg(test)]
use crate::ai_integration::clients::mock_client::MockClient;
use crate::ai_integration::clients::multi_client::MultiClient;
use crate::ai_integration::clients::multi_client::multi_embedding_model::MultiEmbeddingModel;
use crate::ai_integration::entities::document::Document;
use crate::ai_integration::services::ai_client_provider::{
    AiClientProvider, AiClientProviderError,
};
use crate::infrastructure::value_objects::app_data_directory::AppDataDirectory;
use crate::settings::repositories::settings_repository::SettingsRepository;

#[cfg(not(debug_assertions))]
const VECTOR_STORE_NAME: &str = "vector_store.db";
#[cfg(debug_assertions)]
const VECTOR_STORE_NAME: &str = "vector_store.dev.db";

#[derive(ScopeInjectable)]
pub struct DefaultAiClientProvider {
    settings_repository: Arc<dyn SettingsRepository>,
    app_data_directory: Arc<AppDataDirectory>,
    #[cfg(test)]
    mock_client: Arc<MockClient>,
}

#[async_trait]
impl AiClientProvider for DefaultAiClientProvider {
    async fn get_client(&self) -> Result<MultiClient, AiClientProviderError> {
        let settings = self.settings_repository.get_settings().await;
        if !settings.enable_ai {
            return Err(AiClientProviderError::AiNotEnabled);
        }

        #[cfg(test)]
        return Ok(MultiClient::Mock((*self.mock_client).clone()));

        #[cfg(not(test))]
        {
            match ollama::Client::from_val(Nothing.into()) {
                Ok(client) => Ok(MultiClient::Ollama(client)),
                Err(err) => {
                    log::error!("Error creating the Ollama client: {:?}", err);
                    Err(AiClientProviderError::CreateClient)
                }
            }
        }
    }

    async fn get_completion_model_name(&self) -> Result<String, AiClientProviderError> {
        #[cfg(test)]
        return Ok(self.mock_client.model.clone().unwrap_or_default());

        #[cfg(not(test))]
        {
            let settings = self.settings_repository.get_settings().await;

            if settings.ollama_model_name.is_none() {
                return Err(AiClientProviderError::OllamaModelNameIsNotFilled);
            }

            let model_name = settings
                .ollama_model_name
                .as_ref()
                .unwrap()
                .clone()
                .trim()
                .to_string();

            if model_name.is_empty() {
                return Err(AiClientProviderError::OllamaModelNameIsNotFilled);
            }

            log::info!("Using the model with name '{model_name}'.");
            Ok(model_name)
        }
    }

    async fn get_embeddings_model_name(&self) -> Result<String, AiClientProviderError> {
        #[cfg(test)]
        return Ok(self
            .mock_client
            .embeddings_model
            .clone()
            .unwrap_or_default());

        #[cfg(not(test))]
        {
            let settings = self.settings_repository.get_settings().await;

            if settings.ollama_embeddings_model_name.is_none() {
                return Err(AiClientProviderError::OllamaEmbeddingsModelNameIsNotFilled);
            }

            let model_name = settings
                .ollama_embeddings_model_name
                .as_ref()
                .unwrap()
                .clone()
                .trim()
                .to_string();

            if model_name.is_empty() {
                return Err(AiClientProviderError::OllamaEmbeddingsModelNameIsNotFilled);
            }

            log::info!("Using the embeddings model with name '{model_name}'.");
            Ok(model_name)
        }
    }

    async fn get_vector_store(
        &self,
        embed_model: &MultiEmbeddingModel,
    ) -> Result<SqliteVectorStore<MultiEmbeddingModel, Document>, AiClientProviderError> {
        let path = self.app_data_directory.get_path().join(VECTOR_STORE_NAME);
        let path = &*path.to_string_lossy();
        let conn = match Connection::open(path).await {
            Err(err) => {
                return Err(AiClientProviderError::ConnectingToEmbeddingsDatabase(
                    Box::new(err),
                ));
            }
            Ok(conn) => conn,
        };
        Ok(SqliteVectorStore::new(conn, embed_model).await?)
    }
}
