use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use rig::client::AgentClientExt;
use rig::extractor::ExtractionError;

use crate::ai_integration::entities::chat::Chat;
use crate::ai_integration::json_schemas::generate_title::GenerateTitle;
use crate::ai_integration::prompts::PREAMBLE_GENERATE_TITLE;
use crate::ai_integration::services::ai_client_provider::AiClientProvider;
use crate::ai_integration::services::chat_creator::{ChatCreator, ChatCreatorError};

#[derive(ScopeInjectable)]
pub struct DefaultChatCreator {
    ai_client_provider: Arc<dyn AiClientProvider>,
}

#[async_trait]
impl ChatCreator for DefaultChatCreator {
    async fn create_chat(&self, prompt: &str) -> Result<Chat, ChatCreatorError> {
        // TODO: use the cancelled state here in retries
        let response = match self
            .ai_client_provider
            .get_client()
            .await?
            .extractor::<GenerateTitle>(self.ai_client_provider.get_completion_model_name().await?)
            .preamble(PREAMBLE_GENERATE_TITLE)
            .build()
            .extract(format!("User message: {}", prompt))
            .await
        {
            Ok(response) => response,
            Err(ExtractionError::CompletionError(completion_err)) => {
                return Err(ChatCreatorError::try_from(completion_err)
                    .unwrap_or_else(|e| ChatCreatorError::CreateChat(Box::new(e))));
            }
            Err(err) => return Err(ChatCreatorError::CreateChat(Box::new(err))),
        };

        log::info!("Generated title for chat is '{}'.", response.title);
        Ok(Chat::new(None, response.title))
    }
}

#[cfg(test)]
pub mod tests {
    use injector::{injector::Injector, register_scope};
    use rig::{
        OneOrMany,
        completion::{CompletionResponse, Usage},
        message::{AssistantContent, Message as RigMessage, UserContent},
    };
    use tokio::sync::Mutex;

    use crate::{
        ai_integration::{
            clients::{mock_client::MockClient, multi_client::multi_response::MultiResponse},
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
        register_scope!(injector, dyn ChatCreator, DefaultChatCreator);

        injector
    }

    #[tokio::test]
    pub async fn create_chat_valid_prompt_returned_chat_with_generated_title() {
        // Arrange

        let mock_client = MockClient {
            completion_fn: Arc::new(Some(Box::new(|request| {
                if let RigMessage::User { content } = request.chat_history.last()
                    && let UserContent::Text(text) = content.last()
                    && text.text() == "User message: User prompt"
                {
                    let tool_call = AssistantContent::tool_call(
                        "id",
                        "submit",
                        serde_json::to_value(GenerateTitle {
                            title: "Chat title".to_string(),
                        })
                        .unwrap(),
                    );
                    return CompletionResponse {
                        choice: OneOrMany::one(tool_call),
                        raw_response: MultiResponse::Mock,
                        usage: Usage::default(),
                        message_id: None,
                    };
                }

                panic!()
            }))),
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn ChatCreator>().await;

        // Act

        let chat = service.create_chat("User prompt").await.unwrap();

        // Assert

        assert_eq!("Chat title", chat.title());
    }
}
