use std::sync::Arc;

#[cfg(not(test))]
use rig::client::{Nothing, ProviderClient};
#[cfg(not(test))]
use rig::providers::ollama;
use rig::{
    agent::{Agent, MultiTurnStreamItem, StreamingError, Text},
    client::CompletionClient,
    completion::PromptError,
    streaming::{StreamedAssistantContent, StreamingChat},
};
use serde::Serialize;
use thiserror::Error;
use tokio::sync::Mutex;
use tokio_stream::StreamExt;

#[cfg(test)]
use crate::ai_integration::clients::mock_client::MockClient;
use crate::{
    Guid,
    ai_integration::{
        ai_state::AiState,
        clients::multi_completion_client::{
            MultiCompletionClient, multi_completion_model::MultiCompletionModel,
        },
        entities::{
            chat::Chat,
            message::{Message, MessageRole},
        },
        json_schemas::generate_title::GenerateTitle,
        repositories::traits::ai_repository::AiRepository,
        state_cancellation_hook::StateCancellationHook,
        tools::create_flash_card::CreateFlashCard,
    },
    common::repository_error::RepositoryError,
    settings::Settings,
};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum StreamLlmResponseEvent {
    CreatedChat(Chat),
    InProgress(String),
    Finished,
    Error(String),
}

#[derive(Error, Debug, PartialEq, Eq)]
pub enum AiServiceError {
    #[error("{0}")]
    UnknownRepositoryError(#[from] RepositoryError),
    #[error("Ai is not enabled in settings!")]
    AiNotEnabled,
    #[error("Ollama model name is not filled in settings!")]
    #[cfg(not(test))]
    OllamaModelNameIsNotFilled,
    #[error("An unknown error has happened!")]
    UnknownError(String),
}

impl From<String> for AiServiceError {
    fn from(value: String) -> Self {
        AiServiceError::UnknownError(value)
    }
}

pub struct AiService {
    settings: Arc<Mutex<Settings>>,
    state: Arc<AiState>,
    ai_repository: Arc<dyn AiRepository>,
    #[cfg(test)]
    mock_client: MockClient,
}

impl AiService {
    pub fn new(
        settings: Arc<Mutex<Settings>>,
        state: Arc<AiState>,
        ai_repository: Arc<dyn AiRepository>,
        #[cfg(test)] mock_client: MockClient,
    ) -> Self {
        Self {
            settings,
            state,
            ai_repository,
            #[cfg(test)]
            mock_client,
        }
    }

    pub async fn stream<F>(
        &self,
        prompt: String,
        chat_id: Option<Guid>,
        on_event: F,
    ) -> Result<(), AiServiceError>
    where
        F: Fn(StreamLlmResponseEvent) -> Result<(), String>,
    {
        let _ = self.state.start_generation().await;

        let messages;
        let current_chat_id;
        if let Some(chat_id) = chat_id {
            messages = self
                .ai_repository
                .get_chat_messages_ordered(chat_id)
                .await?;
            current_chat_id = chat_id;
        } else {
            let chat = self.create_chat(&prompt).await?;
            self.ai_repository.upsert_chat(&chat).await?;
            current_chat_id = chat.id();
            log::info!("Created new chat with id '{current_chat_id}'.");
            messages = Vec::new();
            on_event(StreamLlmResponseEvent::CreatedChat(chat))?;
        }

        self.ai_repository
            .upsert_message(&Message::new(
                None,
                current_chat_id,
                MessageRole::Human,
                Some(prompt.clone()),
            ))
            .await?;

        let messages = messages
            .iter()
            .map(|message| message.clone().into())
            .collect();

        let agent = self.get_agent().await?;
        let mut stream = agent
            .stream_chat(prompt, messages)
            .with_hook(StateCancellationHook::new(self.state.clone()))
            .await;

        let mut error_happened = false;
        let mut complete_ai_response = String::new();

        while let Some(content) = stream.next().await {
            #[cfg(debug_assertions)]
            log::info!("Received following answer from AI: {:?}", content);

            match content {
                Ok(content) => {
                    if let MultiTurnStreamItem::StreamAssistantItem(
                        StreamedAssistantContent::Text(Text { text }),
                    ) = content
                    {
                        complete_ai_response = format!("{complete_ai_response}{text}");
                        on_event(StreamLlmResponseEvent::InProgress(text))?;
                    }
                }
                Err(err) => {
                    let mut should_call_callback = true;

                    if let StreamingError::Prompt(ref prompt_error) = err
                        && matches!(**prompt_error, PromptError::PromptCancelled { .. })
                    {
                        should_call_callback = false;
                    }

                    if should_call_callback {
                        on_event(StreamLlmResponseEvent::Error(err.to_string()))?;
                        error_happened = true;
                    }
                    break;
                }
            };
        }

        // Only save AI message when an error does not happen.
        if !error_happened {
            log::info!("Error happened, not storing user message.");
            self.ai_repository
                .upsert_message(&Message::new(
                    None,
                    current_chat_id,
                    MessageRole::Assistant,
                    Some(complete_ai_response),
                ))
                .await?;
        }

        on_event(StreamLlmResponseEvent::Finished)?;

        Ok(())
    }

    async fn create_chat(&self, prompt: &str) -> Result<Chat, AiServiceError> {
        let response = match self.get_multi_completion_client().await?
            .extractor::<GenerateTitle>(self.get_model_name().await)
            .preamble("You are a chat naming assistant. Your task is to generate a concise, descriptive title for a conversation based on the user's first message. Be specific and descriptive.")
            .build()
            .extract(format!("User message: {}", prompt))
            .await {
                Ok(response) => response,
                Err(err) => return Err(AiServiceError::UnknownError(err.to_string())),
            };

        log::info!("Generated title for chat is '{}'.", response.title);
        Ok(Chat::new(None, response.title))
    }

    async fn get_agent(&self) -> Result<Agent<MultiCompletionModel>, AiServiceError> {
        let client = self.get_multi_completion_client().await?;
        let model_name = self.get_model_name().await;

        Ok(client
            .agent(model_name)
            .temperature(0.5f64)
            .tool(CreateFlashCard)
            .build())
    }

    async fn get_multi_completion_client(&self) -> Result<MultiCompletionClient, AiServiceError> {
        let settings = self.settings.lock().await;
        if !settings.enable_ai {
            return Err(AiServiceError::AiNotEnabled);
        }

        #[cfg(test)]
        return Ok(MultiCompletionClient::Mock(self.mock_client.clone()));

        #[cfg(not(test))]
        {
            if settings.ollama_model_name.is_none() {
                return Err(AiServiceError::OllamaModelNameIsNotFilled);
            }

            let client = MultiCompletionClient::Ollama(ollama::Client::from_val(Nothing));
            Ok(client)
        }
    }

    async fn get_model_name(&self) -> String {
        #[cfg(test)]
        return self.mock_client.model.clone().unwrap_or_default();

        #[cfg(not(test))]
        {
            let settings = self.settings.lock().await;
            let model_name = settings.ollama_model_name.as_ref().unwrap().clone();
            log::info!("Using the model with name '{model_name}'.");
            model_name
        }
    }
}

#[cfg(test)]
pub mod tests {
    use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};

    use rig::{
        OneOrMany,
        completion::{CompletionError, CompletionResponse, Usage},
        message::{AssistantContent, Message, UserContent},
        streaming::RawStreamingChoice,
    };

    use crate::{
        ai_integration::clients::multi_completion_client::multi_response::MultiResponse,
        common::{
            sqlite_repositories_context::SqliteRepositoriesContext,
            traits::repositories_context::RepositoriesContext,
        },
    };

    use super::*;

    async fn get_test_dependencies(
        mock_client: MockClient,
        state: Arc<AiState>,
    ) -> (SqliteRepositoriesContext, AiService) {
        let context = SqliteRepositoriesContext::create_testing_context().await;

        let settings = Settings {
            enable_ai: true,
            ..Default::default()
        };

        let service = AiService::new(
            Arc::new(Mutex::new(settings)),
            state,
            context.ai_repository(),
            mock_client,
        );

        (context, service)
    }

    #[tokio::test]
    pub async fn stream_new_chat_created_new_chat_and_added_messages() {
        // Arrange

        let sent_stream_answer = AtomicBool::new(false);

        let mock_client = MockClient {
            model: None,
            completion_fn: Arc::new(Some(Box::new(|request| {
                if let Message::User { content } = request.chat_history.last()
                    && let UserContent::Text(text) = content.last()
                    && text.text() == "User message: User prompt"
                {
                    let tool_call = AssistantContent::tool_call(
                        "1",
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
            stream_fn: Arc::new(Some(Box::new(move |request| {
                if let Message::User { content } = request.chat_history.last()
                    && let UserContent::Text(text) = content.last()
                    && text.text() == "User prompt"
                    && !sent_stream_answer.load(Ordering::Relaxed)
                {
                    sent_stream_answer.store(true, Ordering::Relaxed);
                    return Ok(Some(RawStreamingChoice::Message("Bot answer".to_string())));
                }

                Ok(None)
            }))),
        };

        let (context, service) =
            get_test_dependencies(mock_client, Arc::new(AiState::default())).await;
        let received_create_chat = Arc::new(AtomicBool::new(false));
        let received_in_progress = Arc::new(AtomicBool::new(false));
        let received_finished = Arc::new(AtomicBool::new(false));

        // Act

        service
            .stream("User prompt".to_string(), None, |event| {
                match event {
                    StreamLlmResponseEvent::CreatedChat(chat) => {
                        received_create_chat
                            .clone()
                            .store(chat.title() == "Chat title", Ordering::Relaxed);
                    }
                    StreamLlmResponseEvent::InProgress(message) => {
                        received_in_progress
                            .clone()
                            .store(message == "Bot answer", Ordering::Relaxed);
                    }
                    StreamLlmResponseEvent::Finished => {
                        received_finished.clone().store(true, Ordering::Relaxed);
                    }
                    _ => (),
                }
                Ok(())
            })
            .await
            .unwrap();

        // Assert

        assert!(received_create_chat.load(Ordering::Relaxed));
        assert!(received_in_progress.load(Ordering::Relaxed));
        assert!(received_finished.load(Ordering::Relaxed));

        let chats = context
            .ai_repository()
            .get_all_chats_sorted_by_date_desc()
            .await
            .unwrap();
        assert_eq!(1, chats.len());
        assert_eq!("Chat title", chats[0].title());

        let messages = context
            .ai_repository()
            .get_chat_messages_ordered(chats[0].id())
            .await
            .unwrap();
        assert_eq!(2, messages.len());

        assert_eq!(Some(&"User prompt".to_string()), messages[0].content());
        assert_eq!(MessageRole::Human, messages[0].role());

        assert_eq!(Some(&"Bot answer".to_string()), messages[1].content());
        assert_eq!(MessageRole::Assistant, messages[1].role());
    }

    #[tokio::test]
    pub async fn stream_cancelled_response_stopped_generation() {
        // Arrange

        let last_sent_message = Arc::new(AtomicU32::new(1));
        let ai_state = Arc::new(AiState::default());
        let ai_state_clone = ai_state.clone();

        let mock_client = MockClient {
            model: None,
            completion_fn: Arc::new(Some(Box::new(|request| {
                if let Message::User { content } = request.chat_history.last()
                    && let UserContent::Text(text) = content.last()
                    && text.text() == "User message: User prompt"
                {
                    let tool_call = AssistantContent::tool_call(
                        "1",
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
            stream_fn: Arc::new(Some(Box::new(move |request| {
                if let Message::User { content } = request.chat_history.last()
                    && let UserContent::Text(text) = content.last()
                    && text.text() == "User prompt"
                {
                    let current = last_sent_message.load(Ordering::Relaxed);
                    if current > 3 {
                        ai_state_clone.cancel_generation();
                    }
                    last_sent_message.store(current + 1, Ordering::Relaxed);
                    return Ok(Some(RawStreamingChoice::Message(current.to_string())));
                }

                Ok(None)
            }))),
        };

        let (context, service) = get_test_dependencies(mock_client, ai_state).await;
        let received_finished = Arc::new(AtomicBool::new(false));

        // Act

        service
            .stream("User prompt".to_string(), None, |event| {
                if let StreamLlmResponseEvent::Finished = event {
                    received_finished.clone().store(true, Ordering::Relaxed);
                }
                Ok(())
            })
            .await
            .unwrap();

        // Assert

        assert!(received_finished.load(Ordering::Relaxed));

        let chats = context
            .ai_repository()
            .get_all_chats_sorted_by_date_desc()
            .await
            .unwrap();
        let messages = context
            .ai_repository()
            .get_chat_messages_ordered(chats[0].id())
            .await
            .unwrap();
        assert_eq!(Some(&"123".to_string()), messages[1].content());
    }

    #[tokio::test]
    pub async fn stream_error_during_stream_called_correct_event_and_did_not_save_ai_message() {
        // Arrange

        let sent_stream_answer = AtomicBool::new(false);

        let mock_client = MockClient {
            model: None,
            completion_fn: Arc::new(Some(Box::new(|request| {
                if let Message::User { content } = request.chat_history.last()
                    && let UserContent::Text(text) = content.last()
                    && text.text() == "User message: User prompt"
                {
                    let tool_call = AssistantContent::tool_call(
                        "1",
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
            stream_fn: Arc::new(Some(Box::new(move |request| {
                if let Message::User { content } = request.chat_history.last()
                    && let UserContent::Text(text) = content.last()
                    && text.text() == "User prompt"
                {
                    if sent_stream_answer.load(Ordering::Relaxed) {
                        // Fail on second time.
                        return Err(CompletionError::ResponseError("error from AI".to_string()));
                    } else {
                        sent_stream_answer.store(true, Ordering::Relaxed);
                        return Ok(Some(RawStreamingChoice::Message("Bot answer".to_string())));
                    }
                }

                Ok(None)
            }))),
        };

        let (context, service) =
            get_test_dependencies(mock_client, Arc::new(AiState::default())).await;
        let received_error = Arc::new(AtomicBool::new(false));
        let received_finished = Arc::new(AtomicBool::new(false));

        // Act

        service
            .stream("User prompt".to_string(), None, |event| {
                match event {
                    StreamLlmResponseEvent::Error(error) => {
                        received_error.clone().store(
                            error == "CompletionError: ResponseError: error from AI",
                            Ordering::Relaxed,
                        );
                    }
                    StreamLlmResponseEvent::Finished => {
                        received_finished.clone().store(true, Ordering::Relaxed);
                    }
                    _ => (),
                }
                Ok(())
            })
            .await
            .unwrap();

        // Assert

        assert!(received_finished.load(Ordering::Relaxed));
        assert!(received_error.load(Ordering::Relaxed));

        let chats = context
            .ai_repository()
            .get_all_chats_sorted_by_date_desc()
            .await
            .unwrap();
        assert_eq!(1, chats.len());

        let messages = context
            .ai_repository()
            .get_chat_messages_ordered(chats[0].id())
            .await
            .unwrap();
        assert_eq!(1, messages.len());
    }
}
