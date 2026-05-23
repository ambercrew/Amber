use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
#[cfg(not(test))]
use rig::client::{BearerAuth, Nothing, ProviderClient};
use rig::embeddings::EmbeddingModel;
#[cfg(not(test))]
use rig::providers::{ollama, openai};
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
use crate::secrets::repositories::secrets_repository::SecretsRepository;
use crate::settings::repositories::settings_repository::SettingsRepository;
#[cfg(not(test))]
use crate::settings::value_objects::ai_provider::AiProvider;

#[cfg(not(debug_assertions))]
const VECTOR_STORE_NAME: &str = "vector_store.db";
#[cfg(debug_assertions)]
const VECTOR_STORE_NAME: &str = "vector_store.dev.db";

#[derive(ScopeInjectable)]
pub struct DefaultAiClientProvider {
    settings_repository: Arc<dyn SettingsRepository>,
    #[cfg_attr(test, allow(dead_code))]
    secrets_repository: Arc<dyn SecretsRepository>,
    app_data_directory: Arc<AppDataDirectory>,
    #[cfg(test)]
    mock_client: Arc<MockClient>,
}

pub const OPENAI_API_KEY_SECRET: &str = "openai_api_key";

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
            match settings.ai_provider {
                AiProvider::Ollama => match ollama::Client::from_val(Nothing.into()) {
                    Ok(client) => Ok(MultiClient::Ollama(client)),
                    Err(err) => {
                        log::error!("Error creating the Ollama client: {:?}", err);
                        Err(AiClientProviderError::CreateClient)
                    }
                },
                AiProvider::OpenAI => {
                    let api_key = self
                        .secrets_repository
                        .get_secret(OPENAI_API_KEY_SECRET)
                        .await
                        .ok_or(AiClientProviderError::OpenAIApiKeyNotSet)?;
                    match openai::CompletionsClient::from_val(BearerAuth::from(api_key)) {
                        Ok(client) => Ok(MultiClient::OpenAI(client)),
                        Err(err) => {
                            log::error!("Error creating the OpenAI client: {:?}", err);
                            Err(AiClientProviderError::CreateClient)
                        }
                    }
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

            match settings.ai_provider {
                AiProvider::Ollama => {
                    if settings.ollama.model_name.is_none() {
                        return Err(AiClientProviderError::OllamaModelNameIsNotFilled);
                    }
                    let model_name = settings
                        .ollama
                        .model_name
                        .as_ref()
                        .unwrap()
                        .clone()
                        .trim()
                        .to_string();
                    if model_name.is_empty() {
                        return Err(AiClientProviderError::OllamaModelNameIsNotFilled);
                    }
                    log::info!("Using the Ollama model with name '{model_name}'.");
                    Ok(model_name)
                }
                AiProvider::OpenAI => {
                    if settings.openai.model_name.is_none() {
                        return Err(AiClientProviderError::OpenAIModelNameIsNotFilled);
                    }
                    let model_name = settings
                        .openai
                        .model_name
                        .as_ref()
                        .unwrap()
                        .clone()
                        .trim()
                        .to_string();
                    if model_name.is_empty() {
                        return Err(AiClientProviderError::OpenAIModelNameIsNotFilled);
                    }
                    log::info!("Using the OpenAI model with name '{model_name}'.");
                    Ok(model_name)
                }
            }
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

            match settings.ai_provider {
                AiProvider::Ollama => {
                    if settings.ollama.embeddings_model_name.is_none() {
                        return Err(AiClientProviderError::OllamaEmbeddingsModelNameIsNotFilled);
                    }
                    let model_name = settings
                        .ollama
                        .embeddings_model_name
                        .as_ref()
                        .unwrap()
                        .clone()
                        .trim()
                        .to_string();
                    if model_name.is_empty() {
                        return Err(AiClientProviderError::OllamaEmbeddingsModelNameIsNotFilled);
                    }
                    log::info!("Using the Ollama embeddings model with name '{model_name}'.");
                    Ok(model_name)
                }
                AiProvider::OpenAI => {
                    if settings.openai.embeddings_model_name.is_none() {
                        return Err(AiClientProviderError::OpenAIEmbeddingsModelNameIsNotFilled);
                    }
                    let model_name = settings
                        .openai
                        .embeddings_model_name
                        .as_ref()
                        .unwrap()
                        .clone()
                        .trim()
                        .to_string();
                    if model_name.is_empty() {
                        return Err(AiClientProviderError::OpenAIEmbeddingsModelNameIsNotFilled);
                    }
                    log::info!("Using the OpenAI embeddings model with name '{model_name}'.");
                    Ok(model_name)
                }
            }
        }
    }

    async fn get_vector_store(
        &self,
        embed_model: &MultiEmbeddingModel,
    ) -> Result<SqliteVectorStore<MultiEmbeddingModel, Document>, AiClientProviderError> {
        let path = self
            .app_data_directory
            .get_path()
            .join(format!("{VECTOR_STORE_NAME}_{}", embed_model.ndims()));
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
