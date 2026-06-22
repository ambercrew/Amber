use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use rig::client::CompletionClient;
use rig::completion::{Prompt, PromptError};

use crate::ai_integration::ai_state::AiState;
use crate::ai_integration::prompts::CLOZE_SUGGESTION_PREAMBLE;
use crate::ai_integration::services::ai_client_provider::AiClientProvider;
use crate::ai_integration::services::ai_streamer::AiStreamerError;
use crate::ai_integration::services::cloze_suggester::{ClozeSuggester, ClozeSuggesterError};
use crate::ai_integration::state_cancellation_hook::StateCancellationHook;

#[derive(ScopeInjectable)]
pub struct DefaultClozeSuggester {
    state: Arc<AiState>,
    ai_client_provider: Arc<dyn AiClientProvider>,
}

#[async_trait]
impl ClozeSuggester for DefaultClozeSuggester {
    async fn suggest(&self, content: String) -> Result<String, ClozeSuggesterError> {
        let _guard = self.state.start_generation().await;

        let client = self.ai_client_provider.get_client().await?;
        let completion_model_name = self.ai_client_provider.get_completion_model_name().await?;

        let agent = client
            .agent(&completion_model_name)
            .preamble(CLOZE_SUGGESTION_PREAMBLE)
            .build();

        match agent
            .prompt(content)
            .with_hook(StateCancellationHook::new(self.state.clone()))
            .await
        {
            Ok(response) => Ok(response),
            Err(PromptError::PromptCancelled { .. }) => Err(ClozeSuggesterError::Cancelled),
            Err(PromptError::CompletionError(completion_err)) => {
                let message = AiStreamerError::try_from(completion_err)
                    .map_or_else(|e| e.to_string(), |e| e.to_string());
                Err(ClozeSuggesterError::Generation(message))
            }
            Err(other) => Err(ClozeSuggesterError::Generation(other.to_string())),
        }
    }
}

#[cfg(test)]
mod tests {
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
        injector.register_singleton(Arc::new(AiState::default()));

        register_scope!(injector, dyn SettingsRepository, DiskSettingsRepository);
        register_scope!(injector, dyn AiClientProvider, DefaultAiClientProvider);
        register_scope!(injector, dyn ClozeSuggester, DefaultClozeSuggester);

        injector
    }

    #[tokio::test]
    async fn suggest_valid_content_returns_cloze_tagged_content() {
        // Arrange

        let suggestion = r#"<cloze index="1">Paris</cloze> is the capital of France."#;

        let mock_client = MockClient {
            completion_fn: Arc::new(Some(Box::new(move |request| {
                let is_user_content = matches!(
                    request.chat_history.last(),
                    RigMessage::User { content }
                        if matches!(content.last(), UserContent::Text(text)
                            if text.text() == "Paris is the capital of France.")
                );
                assert!(is_user_content);

                CompletionResponse {
                    choice: OneOrMany::one(AssistantContent::text(suggestion)),
                    raw_response: MultiResponse::Mock,
                    usage: Usage::default(),
                    message_id: None,
                }
            }))),
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn ClozeSuggester>().await;

        // Act

        let actual = service
            .suggest("Paris is the capital of France.".to_string())
            .await
            .unwrap();

        // Assert

        assert_eq!(suggestion, actual);
    }
}
