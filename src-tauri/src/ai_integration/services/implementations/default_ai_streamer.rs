use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use rig::streaming::StreamedUserContent;
use rig::{
    agent::{MultiTurnStreamItem, StreamingError, Text},
    completion::PromptError,
    streaming::{StreamedAssistantContent, StreamingChat},
};
use tokio::sync::Mutex;
use tokio_stream::StreamExt;

use crate::ai_integration::ai_state::AiState;
use crate::ai_integration::dto::stream_ai_request_dto::StreamAiRequestDto;
use crate::ai_integration::entities::message::{Message, MessageContent};
use crate::ai_integration::repositories::ai_repository::AiRepository;
use crate::ai_integration::services::agent_provider::AgentProvider;
use crate::ai_integration::services::ai_streamer::{
    AiStreamer, AiStreamerError, OnEventCallback, StreamLlmResponseEvent,
};
use crate::ai_integration::services::chat_creator::ChatCreator;
use crate::ai_integration::state_cancellation_hook::StateCancellationHook;

#[derive(ScopeInjectable)]
pub struct DefaultAiStreamer {
    state: Arc<AiState>,
    ai_repository: Arc<dyn AiRepository>,
    chat_creator: Arc<dyn ChatCreator>,
    agent_provider: Arc<dyn AgentProvider>,
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
            let chat = self.chat_creator.create_chat(&request.prompt).await?;
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
            .agent_provider
            .get_agent(
                chat_id,
                &messages,
                request.element_id,
                &request.context_snippets,
            )
            .await?;
        let rig_messages: Vec<rig::message::Message> = messages
            .into_iter()
            .filter_map(|m| m.try_into().ok())
            .collect();
        let mut stream = agent
            .stream_chat(request.prompt, rig_messages)
            .add_hook(StateCancellationHook::new(self.state.clone()))
            .await;

        let mut complete_ai_response = String::new();

        // TODO: should it check if cancelled here?
        // TODO: is there a better way to check midway than hook
        while let Some(content) = stream.next().await {
            match content {
                Ok(content) => {
                    if let MultiTurnStreamItem::StreamAssistantItem(
                        StreamedAssistantContent::Text(Text { text, .. }),
                    ) = content
                    {
                        complete_ai_response = format!("{complete_ai_response}{text}");
                        on_event(StreamLlmResponseEvent::InProgress { chat_id, text })?;
                    } else if let MultiTurnStreamItem::StreamAssistantItem(
                        StreamedAssistantContent::ToolCall { tool_call, .. },
                    ) = content
                    {
                        log::info!("Tool call: {:#?}", tool_call);

                        messages_to_upsert.lock().await.push(Message::new(
                            None,
                            chat_id,
                            MessageContent::ToolCall(tool_call.into()),
                        ));
                    } else if let MultiTurnStreamItem::StreamUserItem(
                        StreamedUserContent::ToolResult { tool_result, .. },
                    ) = content
                    {
                        log::info!("Tool result: {:#?}", tool_result);

                        messages_to_upsert.lock().await.push(Message::new(
                            None,
                            chat_id,
                            MessageContent::ToolResult(tool_result.into()),
                        ));
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

#[cfg(test)]
pub mod tests {
    use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};

    use injector::{injector::Injector, register_scope};
    use rig::{
        OneOrMany,
        completion::{CompletionError, CompletionResponse, Usage},
        message::{AssistantContent, Message as RigMessage, UserContent},
        streaming::RawStreamingChoice,
    };

    use crate::{
        ai_integration::{
            ai_state::AiState,
            clients::{mock_client::MockClient, multi_client::multi_response::MultiResponse},
            entities::{chat::Chat, message::MessageContent},
            json_schemas::generate_title::GenerateTitle,
            repositories::ai_repository::AiRepository,
            services::{
                agent_provider::AgentProvider,
                ai_client_provider::AiClientProvider,
                ai_streamer::{AiStreamer, StreamLlmResponseEvent},
                chat_creator::ChatCreator,
                implementations::{
                    default_agent_provider::DefaultAgentProvider,
                    default_ai_client_provider::DefaultAiClientProvider,
                    default_chat_creator::DefaultChatCreator,
                },
            },
        },
        bibliographical_sources::{
            repositories::bibliographical_source_repository::BibliographicalSourceRepository,
            services::{
                bibliographical_source_service::BibliographicalSourceService,
                implementations::default_bibliographical_source_service::DefaultBibliographicalSourceService,
            },
        },
        elements::repositories::meta_repository::MetaRepository,
        infrastructure::repositories::{
            disk::disk_settings_repository::DiskSettingsRepository,
            sqlite::{
                sqlite_ai_repository::SqliteAiRepository,
                sqlite_bibliographical_source_repository::SqliteBibliographicalSourceRepository,
                sqlite_meta_repository::SqliteMetaRepository,
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
        register_scope!(injector, dyn ChatCreator, DefaultChatCreator);
        register_scope!(injector, dyn MetaRepository, SqliteMetaRepository);
        register_scope!(
            injector,
            dyn BibliographicalSourceRepository,
            SqliteBibliographicalSourceRepository
        );
        register_scope!(
            injector,
            dyn BibliographicalSourceService,
            DefaultBibliographicalSourceService
        );
        register_scope!(injector, dyn AgentProvider, DefaultAgentProvider);
        register_scope!(injector, dyn AiStreamer, DefaultAiStreamer);

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
                        StreamLlmResponseEvent::InProgress { text, .. } => {
                            received_in_progress_clone
                                .store(text == "Bot answer", Ordering::Relaxed);
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
    pub async fn stream_added_search_documents_tool_when_streaming() {
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
                    // Only tool: search documents.
                    && request.tools.len() == 1
                    && request.tools.iter().any(|tool| tool.name == "search_documents")
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
        let repository = scope.resolve::<dyn AiRepository>().await;

        let chat = Chat::new(None, "Chat title".to_string());
        let chat_id = chat.id();
        repository.upsert_chat(&chat).await.unwrap();
        repository
            .upsert_message(&Message::new(
                None,
                chat_id,
                MessageContent::Document(
                    crate::ai_integration::entities::message::DocumentContent {
                        file_name: "file.pdf".to_string(),
                    },
                ),
            ))
            .await
            .unwrap();

        let request = StreamAiRequestDto {
            prompt: "User prompt".to_string(),
            chat_id: Some(chat_id),
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

    #[tokio::test]
    pub async fn stream_tool_call_saves_tool_call_and_tool_result_messages() {
        // Arrange

        let call_count = Arc::new(AtomicU32::new(0));
        let call_count_clone = call_count.clone();

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
            stream_fn: Arc::new(Some(Box::new(move |_| {
                match call_count_clone.fetch_add(1, Ordering::Relaxed) {
                    0 => Ok(Some(RawStreamingChoice::ToolCall(
                        rig::streaming::RawStreamingToolCall::new(
                            "tc-1".to_string(),
                            "search_documents".to_string(),
                            serde_json::json!({ "query": "test", "top_k": 3 }),
                        ),
                    ))),
                    2 => Ok(Some(RawStreamingChoice::Message(
                        "Final answer".to_string(),
                    ))),
                    _ => Ok(None),
                }
            }))),
            embeddings_model_dims: Some(
                crate::ai_integration::clients::mock_client::DEFAULT_MOCK_EMBEDDINGS_DIMS,
            ),
            embed_texts_fn: Arc::new(Some(Box::new(|texts| {
                Ok(texts
                    .into_iter()
                    .map(|text| rig::embeddings::Embedding {
                        document: text,
                        vec: vec![
                            0f64;
                            crate::ai_integration::clients::mock_client::DEFAULT_MOCK_EMBEDDINGS_DIMS
                        ],
                    })
                    .collect())
            }))),
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client, Arc::new(AiState::default())).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn AiStreamer>().await;
        let repository = scope.resolve::<dyn AiRepository>().await;

        let chat = Chat::new(None, "Chat title".to_string());
        let chat_id = chat.id();
        repository.upsert_chat(&chat).await.unwrap();
        repository
            .upsert_message(&Message::new(
                None,
                chat_id,
                MessageContent::Document(
                    crate::ai_integration::entities::message::DocumentContent {
                        file_name: "file.pdf".to_string(),
                    },
                ),
            ))
            .await
            .unwrap();

        let request = StreamAiRequestDto {
            prompt: "User prompt".to_string(),
            chat_id: Some(chat_id),
            ..Default::default()
        };

        // Act

        service
            .stream(request, Arc::new(move |_| Ok(())))
            .await
            .unwrap();

        // Assert

        let messages = repository.get_chat_messages_ordered(chat_id).await.unwrap();

        assert_eq!(5, messages.len());
        assert!(matches!(messages[0].content(), MessageContent::Document(_)));
        assert!(matches!(messages[1].content(), MessageContent::Human(_)));
        assert!(matches!(messages[2].content(), MessageContent::ToolCall(_)));
        assert!(matches!(
            messages[3].content(),
            MessageContent::ToolResult(_)
        ));
        assert!(matches!(
            messages[4].content(),
            MessageContent::Assistant(_)
        ));

        if let (MessageContent::ToolCall(tc), MessageContent::ToolResult(tr)) =
            (messages[2].content(), messages[3].content())
        {
            assert_eq!(tc.id, tr.id);
            assert_eq!(tc.name, "search_documents");
        } else {
            panic!("Expected ToolCall and ToolResult messages");
        }
    }
}
