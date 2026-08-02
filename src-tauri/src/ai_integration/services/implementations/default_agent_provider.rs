use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use rig::agent::Agent;
use rig::client::{AgentClientExt, EmbeddingsClient};
use uuid::Uuid;

use crate::ai_integration::clients::multi_client::multi_completion_model::MultiCompletionModel;
use crate::ai_integration::entities::message::{Message, MessageContent};
use crate::ai_integration::prompts::preamble;
use crate::ai_integration::services::agent_provider::{AgentProvider, AgentProviderError};
use crate::ai_integration::services::ai_client_provider::AiClientProvider;
use crate::ai_integration::tools::search_documents::SearchDocuments;

const DEFAULT_TEMPERATURE: f64 = 0.5;
const DEFAULT_MAX_TURN: usize = 16;

#[derive(ScopeInjectable)]
pub struct DefaultAgentProvider {
    ai_client_provider: Arc<dyn AiClientProvider>,
}

#[async_trait]
impl AgentProvider for DefaultAgentProvider {
    async fn get_agent(
        &self,
        chat_id: Uuid,
        messages: &[Message],
    ) -> Result<Agent<MultiCompletionModel>, AgentProviderError> {
        let client = self.ai_client_provider.get_client().await?;
        let completion_model_name = self.ai_client_provider.get_completion_model_name().await?;

        let builder = client
            .agent(&completion_model_name)
            .temperature(DEFAULT_TEMPERATURE)
            .name("Amber Tutor")
            .default_max_turns(DEFAULT_MAX_TURN)
            .preamble(preamble().as_str());

        let has_documents = messages
            .iter()
            .any(|m| matches!(m.content(), MessageContent::Document(_)));
        if !has_documents {
            return Ok(builder.build());
        }

        let embeddings_model_name = self.ai_client_provider.get_embeddings_model_name().await?;
        let embed_model = client.embedding_model(embeddings_model_name);

        let vector_store = self
            .ai_client_provider
            .get_vector_store(&embed_model)
            .await?;
        let index = Arc::new(vector_store.index(embed_model));

        Ok(builder.tool(SearchDocuments::new(index, chat_id)).build())
    }
}

#[cfg(test)]
pub mod tests {
    use std::sync::atomic::{AtomicBool, Ordering};

    use injector::{injector::Injector, register_scope};
    use rig::{
        OneOrMany,
        completion::{CompletionResponse, Prompt, Usage},
        message::AssistantContent,
    };
    use tokio::sync::Mutex;
    use uuid::Uuid;

    use crate::{
        ai_integration::{
            clients::{mock_client::MockClient, multi_client::multi_response::MultiResponse},
            entities::message::{DocumentContent, Message, MessageContent},
            services::implementations::default_ai_client_provider::DefaultAiClientProvider,
        },
        infrastructure::repositories::disk::disk_settings_repository::DiskSettingsRepository,
        settings::{
            entities::settings::Settings, repositories::settings_repository::SettingsRepository,
            value_objects::settings_profile::SettingsProfile,
        },
        test_utils::{create_temp_directory, create_test_injector},
    };

    use super::*;

    async fn initialize_test_injector(mock_client: MockClient) -> Injector {
        let mut injector = create_test_injector().await;

        let mut settings = Settings::new(create_temp_directory().await, SettingsProfile::Default);
        settings.enable_ai = true;

        injector.register_singleton(Arc::new(Mutex::new(settings)));
        injector.register_singleton(Arc::new(mock_client));

        register_scope!(injector, dyn SettingsRepository, DiskSettingsRepository);
        register_scope!(injector, dyn AiClientProvider, DefaultAiClientProvider);
        register_scope!(injector, dyn AgentProvider, DefaultAgentProvider);

        injector
    }

    fn mock_response_with_text(text: &str) -> CompletionResponse<MultiResponse> {
        CompletionResponse {
            choice: OneOrMany::one(AssistantContent::text(text)),
            raw_response: MultiResponse::Mock,
            usage: Usage::default(),
            message_id: None,
        }
    }

    #[tokio::test]
    pub async fn get_agent_no_document_messages_did_not_add_search_tool() {
        // Arrange

        let no_tools_sent = Arc::new(AtomicBool::new(false));
        let no_tools_sent_clone = no_tools_sent.clone();

        let mock_client = MockClient {
            completion_fn: Arc::new(Some(Box::new(move |request| {
                no_tools_sent_clone.store(request.tools.is_empty(), Ordering::Relaxed);
                mock_response_with_text("Answer")
            }))),
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn AgentProvider>().await;

        let messages = vec![Message::new(
            None,
            Uuid::new_v4(),
            MessageContent::Human("Hello".to_string()),
        )];

        // Act

        let agent = service.get_agent(Uuid::new_v4(), &messages).await.unwrap();
        agent.prompt("Hello").await.unwrap();

        // Assert

        assert!(no_tools_sent.load(Ordering::Relaxed));
    }

    #[tokio::test]
    pub async fn get_agent_has_document_message_added_search_tool() {
        // Arrange

        let search_tool_sent = Arc::new(AtomicBool::new(false));
        let search_tool_sent_clone = search_tool_sent.clone();

        let mock_client = MockClient {
            completion_fn: Arc::new(Some(Box::new(move |request| {
                search_tool_sent_clone.store(
                    request.tools.len() == 1 && request.tools[0].name == "search_documents",
                    Ordering::Relaxed,
                );
                mock_response_with_text("Answer")
            }))),
            embeddings_model_dims: Some(
                crate::ai_integration::clients::mock_client::DEFAULT_MOCK_EMBEDDINGS_DIMS,
            ),
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn AgentProvider>().await;

        let messages = vec![Message::new(
            None,
            Uuid::new_v4(),
            MessageContent::Document(DocumentContent {
                file_name: "file.pdf".to_string(),
            }),
        )];

        // Act

        let agent = service.get_agent(Uuid::new_v4(), &messages).await.unwrap();
        agent.prompt("Hello").await.unwrap();

        // Assert

        assert!(search_tool_sent.load(Ordering::Relaxed));
    }
}
