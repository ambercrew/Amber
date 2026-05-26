use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use rig::client::EmbeddingsClient;
use rig::tool::ToolDyn;
use rig::{
    agent::{Agent, MultiTurnStreamItem, StreamingError, Text},
    client::CompletionClient,
    completion::PromptError,
    extractor::ExtractionError,
    streaming::{StreamedAssistantContent, StreamingChat},
};
use tokio::sync::Mutex;
use tokio_stream::StreamExt;

use crate::Guid;
use crate::ai_integration::ai_state::AiState;
use crate::ai_integration::clients::multi_client::multi_completion_model::MultiCompletionModel;
use crate::ai_integration::dto::stream_ai_request_dto::StreamAiRequestDto;
use crate::ai_integration::entities::chat::Chat;
use crate::ai_integration::entities::message::{Message, MessageContent};
use crate::ai_integration::json_schemas::generate_title::GenerateTitle;
use crate::ai_integration::prompts::{PREAMBLE_GENERATE_TITLE, preamble_with_context};
use crate::ai_integration::repositories::ai_repository::AiRepository;
use crate::ai_integration::services::ai_client_provider::AiClientProvider;
use crate::ai_integration::services::ai_streamer::{
    AiStreamer, AiStreamerError, OnEventCallback, StreamLlmResponseEvent,
};
use crate::ai_integration::state_cancellation_hook::StateCancellationHook;
use crate::ai_integration::tools::create_flash_card::CreateFlashCard;
use crate::ai_integration::tools::search_documents::SearchDocuments;
use crate::cells::entities::cell::Cell;
use crate::cells::repositories::cell_repository::CellRepository;
use crate::file_system::repositories::file_repository::FileRepository;

const DEFAULT_TEMPERATURE: f64 = 0.5;
const DEFAULT_MAX_TURN: usize = 16;

#[derive(ScopeInjectable)]
pub struct DefaultAiStreamer {
    state: Arc<AiState>,
    ai_repository: Arc<dyn AiRepository>,
    ai_client_provider: Arc<dyn AiClientProvider>,

    cell_repository: Arc<dyn CellRepository>,
    file_repository: Arc<dyn FileRepository>,
}

#[async_trait]
impl AiStreamer for DefaultAiStreamer {
    async fn stream(
        &self,
        request: StreamAiRequestDto,
        on_event: OnEventCallback,
    ) -> Result<(), AiStreamerError> {
        let _guard = self.state.start_generation().await;

        let messages;
        let chat_id;
        let mut chat_to_upsert = None;
        if let Some(request_chat_id) = request.chat_id {
            chat_id = request_chat_id;
            messages = self
                .ai_repository
                .get_chat_messages_ordered(chat_id)
                .await?;
        } else {
            let chat = self.create_chat(&request.prompt).await?;
            chat_id = chat.id();
            messages = Vec::new();
            on_event(StreamLlmResponseEvent::CreatedChat(chat.clone()))?;
            chat_to_upsert = Some(chat);
        }

        let messages_to_upsert = Arc::new(Mutex::new(vec![Message::new(
            None,
            chat_id,
            MessageContent::Human(request.prompt.clone()),
        )]));

        let agent = self
            .get_agent(
                &request,
                chat_id,
                messages_to_upsert.clone(),
                on_event.clone(),
            )
            .await?;
        let mut stream = agent
            .stream_chat(request.prompt, messages)
            .with_hook(StateCancellationHook::new(self.state.clone()))
            .await;

        let mut complete_ai_response = String::new();

        while let Some(content) = stream.next().await {
            match content {
                Ok(content) => {
                    if let MultiTurnStreamItem::StreamAssistantItem(
                        StreamedAssistantContent::Text(Text { text }),
                    ) = content
                    {
                        complete_ai_response = format!("{complete_ai_response}{text}");
                        on_event(StreamLlmResponseEvent::InProgress(text))?;
                    } else if let MultiTurnStreamItem::StreamAssistantItem(
                        StreamedAssistantContent::ToolCall { tool_call, .. },
                    ) = content
                    {
                        log::info!("Tool call: {:#?}", tool_call);
                    }
                }
                Err(err) => {
                    log::error!("Error happened while streaming {:?}", err);

                    let is_cancelled = matches!(&err, StreamingError::Prompt(p) if matches!(**p, PromptError::PromptCancelled { .. }));

                    if !is_cancelled {
                        let error_message = match err {
                            StreamingError::Completion(completion_err) => {
                                AiStreamerError::try_from(completion_err)
                                    .map_or_else(|e| e.to_string(), |e| e.to_string())
                            }
                            StreamingError::Prompt(prompt_err) => match *prompt_err {
                                PromptError::CompletionError(completion_err) => {
                                    AiStreamerError::try_from(completion_err)
                                        .map_or_else(|e| e.to_string(), |e| e.to_string())
                                }
                                other => other.to_string(),
                            },
                            other => other.to_string(),
                        };
                        on_event(StreamLlmResponseEvent::Error(error_message))?;
                    }
                    break;
                }
            };
        }

        if !complete_ai_response.trim().is_empty() {
            let mut messages_to_upsert = messages_to_upsert.lock().await;
            messages_to_upsert.push(Message::new(
                None,
                chat_id,
                MessageContent::Assistant(complete_ai_response),
            ));
        }

        // Delaying database operations to the end to avoid the writes from locking
        // the database.
        if let Some(chat) = chat_to_upsert {
            self.ai_repository.upsert_chat(&chat).await?;
        }

        for message in messages_to_upsert.lock().await.iter() {
            self.ai_repository.upsert_message(message).await?;
        }

        Ok(())
    }
}

impl DefaultAiStreamer {
    async fn create_chat(&self, prompt: &str) -> Result<Chat, AiStreamerError> {
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
                return Err(AiStreamerError::try_from(completion_err)
                    .unwrap_or_else(|e| AiStreamerError::CreateChat(Box::new(e))));
            }
            Err(err) => return Err(AiStreamerError::CreateChat(Box::new(err))),
        };

        log::info!("Generated title for chat is '{}'.", response.title);
        Ok(Chat::new(None, response.title))
    }

    async fn get_agent(
        &self,
        request: &StreamAiRequestDto,
        chat_id: Guid,
        messages_to_upsert: Arc<Mutex<Vec<Message>>>,
        on_event: OnEventCallback,
    ) -> Result<Agent<MultiCompletionModel>, AiStreamerError> {
        let client = self.ai_client_provider.get_client().await?;
        let completion_model_name = self.ai_client_provider.get_completion_model_name().await?;
        let embeddings_model_name = self.ai_client_provider.get_embeddings_model_name().await?;
        let embed_model = client.embedding_model(embeddings_model_name);

        let vector_store = self
            .ai_client_provider
            .get_vector_store(&embed_model)
            .await?;
        let index = Arc::new(vector_store.index(embed_model));

        let mut tools: Vec<Box<dyn ToolDyn>> = vec![Box::new(SearchDocuments::new(index, chat_id))];

        let mut builder = client
            .agent(&completion_model_name)
            .temperature(DEFAULT_TEMPERATURE)
            .name("Brainy Tutor")
            .default_max_turns(DEFAULT_MAX_TURN);

        tools.push(Box::new(CreateFlashCard::new(
            chat_id,
            messages_to_upsert,
            Some(on_event),
            self.file_repository.clone(),
        )));

        let mut file = if let Some(file_id) = request.opened_file_id {
            Some(self.file_repository.get_by_id(file_id).await?)
        } else {
            None
        };

        let mut cell: Option<Cell> = None;

        if let Some(cell_id) = request.context_cell_id {
            cell = Some(self.cell_repository.get_by_id(cell_id).await?);

            if file.is_none() {
                file = Some(
                    self.file_repository
                        .get_by_id(cell.as_ref().unwrap().file_id())
                        .await?,
                );
            }
        }

        let preamble = preamble_with_context(&file, &cell);
        builder = builder.preamble(preamble.as_str());

        let builder = builder.tools(tools);

        Ok(builder.build())
    }
}

#[cfg(test)]
pub mod tests {
    use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};

    use injector::{injector::Injector, register_scope};
    use rig::{
        OneOrMany,
        completion::{CompletionError, CompletionResponse, Usage},
        message::{AssistantContent, Message as RigMessage, UserContent},
        streaming::RawStreamingChoice,
        tool::Tool,
    };

    use crate::{
        ai_integration::{
            ai_state::AiState,
            clients::{mock_client::MockClient, multi_client::multi_response::MultiResponse},
            entities::message::MessageContent,
            json_schemas::generate_title::GenerateTitle,
            repositories::ai_repository::AiRepository,
            services::{
                ai_streamer::{AiStreamer, StreamLlmResponseEvent},
                implementations::default_ai_client_provider::DefaultAiClientProvider,
            },
            tools::create_flash_card::CreateFlashCard,
        },
        infrastructure::repositories::{
            disk::disk_settings_repository::DiskSettingsRepository,
            sqlite::{
                sqlite_ai_repository::SqliteAiRepository,
                sqlite_cell_repository::SqliteCellRepository,
                sqlite_file_repository::SqliteFileRepository,
            },
        },
        settings::{
            entities::settings::Settings, repositories::settings_repository::SettingsRepository,
            value_objects::settings_profile::SettingsProfile,
        },
        test_utils::{create_temp_directory, create_test_injector},
    };
    use tokio::sync::Mutex;

    use super::*;

    async fn initialize_test_injector(mock_client: MockClient, state: Arc<AiState>) -> Injector {
        let mut injector = create_test_injector().await;

        let mut settings = Settings::new(create_temp_directory().await, SettingsProfile::Default);
        settings.enable_ai = true;

        injector.register_singleton(Arc::new(Mutex::new(settings)));
        injector.register_singleton(Arc::new(mock_client));
        injector.register_singleton(state);

        register_scope!(injector, dyn SettingsRepository, DiskSettingsRepository);
        register_scope!(injector, dyn AiRepository, SqliteAiRepository);
        register_scope!(injector, dyn AiClientProvider, DefaultAiClientProvider);
        register_scope!(injector, dyn AiStreamer, DefaultAiStreamer);
        register_scope!(injector, dyn CellRepository, SqliteCellRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);

        injector
    }

    #[tokio::test]
    pub async fn stream_new_chat_created_new_chat_and_added_messages() {
        // Arrange

        let sent_stream_answer = AtomicBool::new(false);

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
            stream_fn: Arc::new(Some(Box::new(move |request| {
                if let RigMessage::User { content } = request.chat_history.last()
                    && let UserContent::Text(text) = content.last()
                    && text.text() == "User prompt"
                    && !sent_stream_answer.load(Ordering::Relaxed)
                {
                    sent_stream_answer.store(true, Ordering::Relaxed);
                    return Ok(Some(RawStreamingChoice::Message("Bot answer".to_string())));
                }

                Ok(None)
            }))),
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client, Arc::new(AiState::default())).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn AiStreamer>().await;
        let repository = scope.resolve::<dyn AiRepository>().await;

        let received_create_chat = Arc::new(AtomicBool::new(false));
        let received_in_progress = Arc::new(AtomicBool::new(false));

        // Clone before moving into closure
        let received_create_chat_clone = Arc::clone(&received_create_chat);
        let received_in_progress_clone = Arc::clone(&received_in_progress);

        let request = StreamAiRequestDto {
            prompt: "User prompt".to_string(),
            ..Default::default()
        };

        // Act

        service
            .stream(
                request,
                Arc::new(move |event| {
                    match event {
                        StreamLlmResponseEvent::CreatedChat(chat) => {
                            received_create_chat_clone
                                .store(chat.title() == "Chat title", Ordering::Relaxed);
                        }
                        StreamLlmResponseEvent::InProgress(message) => {
                            received_in_progress_clone
                                .store(message == "Bot answer", Ordering::Relaxed);
                        }
                        _ => (),
                    }
                    Ok(())
                }),
            )
            .await
            .unwrap();

        // Assert

        assert!(received_create_chat.load(Ordering::Relaxed));
        assert!(received_in_progress.load(Ordering::Relaxed));

        let chats = repository
            .get_all_chats_sorted_by_date_desc()
            .await
            .unwrap();
        assert_eq!(1, chats.len());
        assert_eq!("Chat title", chats[0].title());

        let messages = repository
            .get_chat_messages_ordered(chats[0].id())
            .await
            .unwrap();
        assert_eq!(2, messages.len());

        assert_eq!(
            MessageContent::Human("User prompt".to_string()),
            *messages[0].content()
        );

        assert_eq!(
            MessageContent::Assistant("Bot answer".to_string()),
            *messages[1].content()
        );
    }

    #[tokio::test]
    pub async fn stream_added_tools_when_file_id_is_given() {
        // Arrange

        let valid_request = Arc::new(AtomicBool::new(false));
        let valid_request_clone = valid_request.clone();

        let mock_client = MockClient {
            completion_fn: Arc::new(Some(Box::new(|_| {
                let tool_call = AssistantContent::tool_call(
                    "id",
                    "submit",
                    serde_json::to_value(GenerateTitle {
                        title: "Chat title".to_string(),
                    })
                    .unwrap(),
                );
                CompletionResponse {
                    choice: OneOrMany::one(tool_call),
                    raw_response: MultiResponse::Mock,
                    usage: Usage::default(),
                    message_id: None,
                }
            }))),
            stream_fn: Arc::new(Some(Box::new(move |request| {
                if let RigMessage::User { content } = request.chat_history.last()
                    && let UserContent::Text(text) = content.last()
                    && text.text() == "User prompt"
                    // Two tools, one for searching documents and one for creating flash cards.
                    && request.tools.len() == 2
                    && request.tools.iter().any(|tool| tool.name == CreateFlashCard::NAME)
                {
                    valid_request_clone.store(true, Ordering::Relaxed);
                }

                Ok(None)
            }))),
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client, Arc::new(AiState::default())).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn AiStreamer>().await;

        let request = StreamAiRequestDto {
            prompt: "User prompt".to_string(),
            ..Default::default()
        };

        // Act

        service
            .stream(request, Arc::new(move |_| Ok(())))
            .await
            .unwrap();

        // Assert

        assert!(valid_request.load(Ordering::Relaxed));
    }

    #[tokio::test]
    pub async fn stream_cancelled_response_stopped_generation() {
        // Arrange

        let last_sent_message = Arc::new(AtomicU32::new(1));
        let ai_state = Arc::new(AiState::default());
        let ai_state_clone = ai_state.clone();

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
            stream_fn: Arc::new(Some(Box::new(move |request| {
                if let RigMessage::User { content } = request.chat_history.last()
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
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client, ai_state).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn AiStreamer>().await;
        let repository = scope.resolve::<dyn AiRepository>().await;

        let request = StreamAiRequestDto {
            prompt: "User prompt".to_string(),
            ..Default::default()
        };

        // Act

        service
            .stream(request, Arc::new(move |_| Ok(())))
            .await
            .unwrap();

        // Assert

        let chats = repository
            .get_all_chats_sorted_by_date_desc()
            .await
            .unwrap();
        let messages = repository
            .get_chat_messages_ordered(chats[0].id())
            .await
            .unwrap();
        assert_eq!(
            MessageContent::Assistant("123".to_string()),
            *messages[1].content()
        );
    }

    #[tokio::test]
    pub async fn stream_error_during_stream_called_correct_event_and_did_not_save_ai_message() {
        // Arrange

        let sent_stream_answer = AtomicBool::new(false);

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
            stream_fn: Arc::new(Some(Box::new(move |request| {
                if let RigMessage::User { content } = request.chat_history.last()
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
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client, Arc::new(AiState::default())).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn AiStreamer>().await;
        let repository = scope.resolve::<dyn AiRepository>().await;

        let received_error = Arc::new(AtomicBool::new(false));
        let received_error_clone = received_error.clone();

        let request = StreamAiRequestDto {
            prompt: "User prompt".to_string(),
            ..Default::default()
        };

        // Act

        service
            .stream(
                request,
                Arc::new(move |event| {
                    if let StreamLlmResponseEvent::Error(error) = event {
                        received_error_clone
                            .store(error == "ResponseError: error from AI", Ordering::Relaxed);
                    }
                    Ok(())
                }),
            )
            .await
            .unwrap();

        // Assert

        assert!(received_error.load(Ordering::Relaxed));

        let chats = repository
            .get_all_chats_sorted_by_date_desc()
            .await
            .unwrap();
        assert_eq!(1, chats.len());

        let messages = repository
            .get_chat_messages_ordered(chats[0].id())
            .await
            .unwrap();
        assert_eq!(2, messages.len());
    }
}
