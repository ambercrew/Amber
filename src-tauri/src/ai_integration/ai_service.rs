use std::path::PathBuf;
use std::sync::Arc;

use injector_derive::ScopeInjectable;
use rig::client::EmbeddingsClient;
#[cfg(not(test))]
use rig::client::{Nothing, ProviderClient};
use rig::embeddings::{EmbedError, EmbeddingError, EmbeddingsBuilder};
use rig::loaders::file::FileLoaderError;
use rig::loaders::pdf::PdfLoaderError;
use rig::loaders::{FileLoader, PdfFileLoader};
#[cfg(not(test))]
use rig::providers::ollama;
use rig::tool::{Tool, ToolDyn};
use rig::vector_store::VectorStoreError;
use rig::{
    agent::{Agent, MultiTurnStreamItem, StreamingError, Text},
    client::CompletionClient,
    completion::PromptError,
    streaming::{StreamedAssistantContent, StreamingChat},
};
use rig_sqlite::SqliteVectorStore;
use serde::Serialize;
use text_splitter::{ChunkConfig, TextSplitter};
use thiserror::Error;
use tokio::sync::Mutex;
use tokio_rusqlite::Connection;
use tokio_stream::StreamExt;

use crate::Guid;
#[cfg(test)]
use crate::ai_integration::clients::mock_client::MockClient;
use crate::ai_integration::clients::multi_client::multi_embedding_model::MultiEmbeddingModel;
use crate::ai_integration::entities::document::Document;
use crate::ai_integration::entities::message::{self, ToolCallStatus};
use crate::ai_integration::prompts::{PREAMBLE_BASE, PREAMBLE_GENERATE_TITLE, PREAMBLE_NO_FILE};
use crate::ai_integration::stream_ai_request::StreamAiRequest;
use crate::ai_integration::tools::create_flash_card::AcceptCreateFlashCard;
use crate::ai_integration::tools::search_documents::SearchDocuments;
use crate::ai_integration::tools::{AcceptToolCallError, AcceptToolCallFromJson};
use crate::cells::cell_service::CellService;
use crate::cells::repositories::cell_repository::CellRepository;
use crate::infrastructure::value_objects::app_data_directory::AppDataDirectory;
use crate::settings::repositories::settings_repository::{
    SettingsRepository, SettingsRepositoryError,
};
use crate::{
    ai_integration::{
        ai_state::AiState,
        clients::multi_client::{MultiClient, multi_completion_model::MultiCompletionModel},
        entities::{
            chat::Chat,
            message::{Message, MessageContent},
        },
        json_schemas::generate_title::GenerateTitle,
        repositories::ai_repository::AiRepository,
        state_cancellation_hook::StateCancellationHook,
        tools::create_flash_card::CreateFlashCard,
    },
    common::repository_error::RepositoryError,
};

const DEFAULT_TEMPERATURE: f64 = 0.5;
const DEFAULT_MAX_TURN: usize = 16;
pub const EMBEDDINGS_DIMENSIONS: usize = 2560;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum StreamLlmResponseEvent {
    CreatedChat(Chat),
    InProgress(String),
    ToolCalled(Message),
    Error(String),
}

#[derive(Error, Debug)]
pub enum AiServiceError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error("Ai is not enabled in settings!")]
    AiNotEnabled,
    #[cfg(not(test))]
    #[error("Ollama model name is not filled in settings!")]
    OllamaModelNameIsNotFilled,
    #[cfg(not(test))]
    #[error("Ollama embeddings model name is not filled in settings!")]
    OllamaEmbeddingsModelNameIsNotFilled,
    #[error("Unknown tool name was given")]
    UnknownToolName,
    #[error("An unknown error has happened!")]
    Unknown(String),
    #[error("Can only accept tool calls")]
    CanOnlyAcceptToolCalls,
    #[error(transparent)]
    AcceptToolCall(#[from] AcceptToolCallError),
    #[error("Error loading file: {0}")]
    FileLoader(#[from] FileLoaderError),
    #[error("Error loading pdf file: {0}")]
    PdfLoader(#[from] PdfLoaderError),
    #[error("Embed error: {0}")]
    Embed(#[from] EmbedError),
    #[error("Embedding error: {0}")]
    Embedding(#[from] EmbeddingError),
    #[error(transparent)]
    SettingsRepository(#[from] SettingsRepositoryError),
    #[error("Error connecting to embeddings database")]
    ConnectingToEmbeddingsDatabase(String),
    #[error(transparent)]
    VectorStore(#[from] VectorStoreError),
}

impl From<String> for AiServiceError {
    fn from(value: String) -> Self {
        AiServiceError::Unknown(value)
    }
}

#[derive(ScopeInjectable)]
pub struct AiService {
    settings_repository: Arc<dyn SettingsRepository>,
    app_data_directory: Arc<AppDataDirectory>,
    state: Arc<AiState>,
    ai_repository: Arc<dyn AiRepository>,
    cell_repository: Arc<dyn CellRepository>,
    cell_service: Arc<CellService>,
    #[cfg(test)]
    mock_client: Arc<MockClient>,
}

pub type OnEventCallback = Arc<dyn Send + Sync + Fn(StreamLlmResponseEvent) -> Result<(), String>>;

impl AiService {
    pub async fn stream(
        &self,
        request: StreamAiRequest,
        on_event: OnEventCallback,
    ) -> Result<(), AiServiceError> {
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
                    let mut should_call_callback = true;

                    if let StreamingError::Prompt(ref prompt_error) = err
                        && matches!(**prompt_error, PromptError::PromptCancelled { .. })
                    {
                        should_call_callback = false;
                    }

                    if should_call_callback {
                        on_event(StreamLlmResponseEvent::Error(err.to_string()))?;
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

    async fn create_chat(&self, prompt: &str) -> Result<Chat, AiServiceError> {
        let response = match self
            .get_multi_client()
            .await?
            .extractor::<GenerateTitle>(self.get_model_name().await?)
            .preamble(PREAMBLE_GENERATE_TITLE)
            .build()
            .extract(format!("User message: {}", prompt))
            .await
        {
            Ok(response) => response,
            Err(err) => return Err(AiServiceError::Unknown(err.to_string())),
        };

        log::info!("Generated title for chat is '{}'.", response.title);
        Ok(Chat::new(None, response.title))
    }

    async fn get_agent(
        &self,
        request: &StreamAiRequest,
        chat_id: Guid,
        messages_to_upsert: Arc<Mutex<Vec<Message>>>,
        on_event: OnEventCallback,
    ) -> Result<Agent<MultiCompletionModel>, AiServiceError> {
        let client = self.get_multi_client().await?;
        let model_name = self.get_model_name().await?;
        let embeddings_model_name = self.get_embeddings_model_name().await?;

        let embed_model =
            client.embedding_model_with_ndims(embeddings_model_name, EMBEDDINGS_DIMENSIONS);
        let vector_store = self.get_sqlite_vector_store(&embed_model).await?;
        let index = Arc::new(vector_store.index(embed_model));

        let mut tools: Vec<Box<dyn ToolDyn>> = vec![Box::new(SearchDocuments::new(index, chat_id))];

        let mut builder = client
            .agent(&model_name)
            .temperature(DEFAULT_TEMPERATURE)
            .name("Brainy Tutor")
            .default_max_turns(DEFAULT_MAX_TURN);

        if let Some(file_id) = request.file_id {
            tools.push(Box::new(CreateFlashCard::new(
                file_id,
                chat_id,
                messages_to_upsert,
                Some(on_event),
            )));
            builder = builder.preamble(PREAMBLE_BASE);
        } else {
            builder = builder.preamble(PREAMBLE_NO_FILE);
        }

        let builder = builder.tools(tools);

        Ok(builder.build())
    }

    pub async fn accept_tool_call(&self, message_id: Guid) -> Result<(), AiServiceError> {
        let mut message = self.ai_repository.get_message_by_id(message_id).await?;
        let tool_call = match message.content_mut() {
            MessageContent::ToolCall(tool_call) => tool_call,
            _ => return Err(AiServiceError::CanOnlyAcceptToolCalls),
        };

        #[allow(clippy::needless_late_init)]
        let tool: Box<dyn AcceptToolCallFromJson>;

        if tool_call.name == CreateFlashCard::NAME {
            tool = Box::new(AcceptCreateFlashCard::new(
                self.cell_repository.clone(),
                self.cell_service.clone(),
            ));
        } else {
            return Err(AiServiceError::UnknownToolName);
        }

        tool.accept_call(tool_call, tool_call.arguments.clone())
            .await?;

        tool_call.status = ToolCallStatus::Accepted;
        self.ai_repository.upsert_message(&message).await?;

        Ok(())
    }

    pub async fn upload_document(
        &self,
        path: impl Into<PathBuf>,
        chat_id: Guid,
    ) -> Result<(), AiServiceError> {
        let path: PathBuf = path.into();
        let embeddings_model_name = self.get_embeddings_model_name().await?;

        let embed_model = self
            .get_multi_client()
            .await?
            .embedding_model_with_ndims(embeddings_model_name, EMBEDDINGS_DIMENSIONS);

        let mut embeddings_builder = EmbeddingsBuilder::new(embed_model.clone());
        let splitter = TextSplitter::new(ChunkConfig::new(512).with_trim(false));

        if let Some(extension) = path.extension()
            && extension == "pdf"
        {
            let loader = PdfFileLoader::with_glob(path.to_str().unwrap())?;

            let pages = loader
                .load_with_path()
                .ignore_errors()
                .by_page()
                .into_iter()
                .flat_map(|(_path, result)| result)
                .map(|(_pageno, result)| result)
                .filter_map(|v| v.ok())
                .enumerate()
                .flat_map(|(page_i, page)| {
                    splitter
                        .chunks(&page)
                        .enumerate()
                        .map(move |(chunk_i, chunk)| Document {
                            id: format!("page_{page_i}_chunk_{chunk_i}"),
                            content: chunk.to_string(),
                            chat_id,
                        })
                        .collect::<Vec<_>>()
                })
                .collect::<Vec<_>>();

            embeddings_builder = embeddings_builder.documents(pages)?;
        } else {
            let loader = FileLoader::with_glob(path.to_str().unwrap())?;

            let contents = loader
                .read()
                .ignore_errors()
                .into_iter()
                .enumerate()
                .flat_map(|(file_i, content)| {
                    splitter
                        .chunks(&content)
                        .enumerate()
                        .map(move |(chunk_i, chunk)| Document {
                            id: format!("content_{file_i}_chunk_{chunk_i}"),
                            content: chunk.to_string(),
                            chat_id,
                        })
                        .collect::<Vec<_>>()
                })
                .collect::<Vec<_>>();

            embeddings_builder = embeddings_builder.documents(contents)?;
        }

        let embeddings = embeddings_builder.build().await?;

        let vector_store = self.get_sqlite_vector_store(&embed_model).await?;
        vector_store.add_rows(embeddings).await.unwrap();

        self.ai_repository
            .upsert_message(&Message::new(
                None,
                chat_id,
                MessageContent::Document(message::DocumentContent {
                    file_name: path
                        .file_name()
                        .and_then(|name| name.to_str())
                        .unwrap_or("")
                        .to_string(),
                }),
            ))
            .await?;

        Ok(())
    }

    async fn get_multi_client(&self) -> Result<MultiClient, AiServiceError> {
        let settings = self.settings_repository.get_settings().await;
        if !settings.enable_ai {
            return Err(AiServiceError::AiNotEnabled);
        }

        #[cfg(test)]
        return Ok(MultiClient::Mock((*self.mock_client).clone()));

        #[cfg(not(test))]
        {
            let client = MultiClient::Ollama(ollama::Client::from_val(Nothing));
            Ok(client)
        }
    }

    async fn get_model_name(&self) -> Result<String, AiServiceError> {
        #[cfg(test)]
        return Ok(self.mock_client.model.clone().unwrap_or_default());

        #[cfg(not(test))]
        {
            let settings = self.settings_repository.get_settings().await;

            if settings.ollama_model_name.is_none() {
                return Err(AiServiceError::OllamaModelNameIsNotFilled);
            }

            let model_name = settings
                .ollama_model_name
                .as_ref()
                .unwrap()
                .clone()
                .trim()
                .to_string();

            if model_name.is_empty() {
                return Err(AiServiceError::OllamaModelNameIsNotFilled);
            }

            log::info!("Using the model with name '{model_name}'.");
            Ok(model_name)
        }
    }

    async fn get_embeddings_model_name(&self) -> Result<String, AiServiceError> {
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
                return Err(AiServiceError::OllamaEmbeddingsModelNameIsNotFilled);
            }

            let model_name = settings
                .ollama_embeddings_model_name
                .as_ref()
                .unwrap()
                .clone()
                .trim()
                .to_string();

            if model_name.is_empty() {
                return Err(AiServiceError::OllamaEmbeddingsModelNameIsNotFilled);
            }

            log::info!("Using the embeddings model with name '{model_name}'.");
            Ok(model_name)
        }
    }

    async fn get_sqlite_vector_store(
        &self,
        embed_model: &MultiEmbeddingModel,
    ) -> Result<SqliteVectorStore<MultiEmbeddingModel, Document>, AiServiceError> {
        let path = self.app_data_directory.get_path().join("vector_store.db");
        let conn = match Connection::open(path.to_str().unwrap()).await {
            Err(err) => {
                return Err(AiServiceError::ConnectingToEmbeddingsDatabase(
                    err.to_string(),
                ));
            }
            Ok(conn) => conn,
        };
        Ok(SqliteVectorStore::new(conn, embed_model).await?)
    }
}

#[cfg(test)]
pub mod tests {
    use std::{
        iter,
        sync::atomic::{AtomicBool, AtomicU32, Ordering},
    };

    use injector::{injector::Injector, register_scope};
    use rig::{
        OneOrMany,
        completion::{CompletionError, CompletionResponse, Usage},
        embeddings::Embedding,
        message::{AssistantContent, Message as RigMessage, UserContent},
        streaming::RawStreamingChoice,
    };

    use crate::{
        ROOT_FOLDER_ID,
        ai_integration::{
            clients::multi_client::multi_response::MultiResponse,
            entities::message::ToolCallContent,
            tools::{
                create_flash_card::CreateFlashcardArgs, search_documents::SearchDocumentsArgs,
            },
        },
        cells::repositories::{
            cell_repository::CellRepository, review_repository::ReviewRepository,
        },
        file_system::{
            file_system_service::FileSystemService,
            repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
            value_objects::file_system_item_name::FileSystemItemName,
        },
        infrastructure::repositories::{
            disk::disk_settings_repository::DiskSettingsRepository,
            sqlite::{
                sqlite_ai_repository::SqliteAiRepository,
                sqlite_cell_repository::SqliteCellRepository,
                sqlite_file_repository::SqliteFileRepository,
                sqlite_folder_repository::SqliteFolderRepository,
                sqlite_review_repository::SqliteReviewRepository,
            },
        },
        settings::{
            entities::settings::Settings, repositories::settings_repository::SettingsRepository,
            value_objects::settings_profile::SettingsProfile,
        },
        test_utils::{create_temp_directory, create_test_injector},
    };

    use super::*;

    async fn initialize_test_injector(mock_client: MockClient, state: Arc<AiState>) -> Injector {
        let mut injector = create_test_injector().await;

        let mut settings = Settings::new(create_temp_directory().await, SettingsProfile::Default);
        settings.enable_ai = true;

        injector.register_singleton(Arc::new(Mutex::new(settings)));
        injector.register_singleton(Arc::new(mock_client));
        injector.register_singleton(state);

        register_scope!(injector, dyn AiRepository, SqliteAiRepository);
        register_scope!(injector, dyn CellRepository, SqliteCellRepository);
        register_scope!(injector, dyn ReviewRepository, SqliteReviewRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn SettingsRepository, DiskSettingsRepository);
        register_scope!(injector, CellService);
        register_scope!(injector, FileSystemService);
        register_scope!(injector, AiService);

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
        let service = scope.resolve::<AiService>().await;
        let repository = scope.resolve::<dyn AiRepository>().await;

        let received_create_chat = Arc::new(AtomicBool::new(false));
        let received_in_progress = Arc::new(AtomicBool::new(false));

        // Clone before moving into closure
        let received_create_chat_clone = Arc::clone(&received_create_chat);
        let received_in_progress_clone = Arc::clone(&received_in_progress);

        let request = StreamAiRequest {
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
        let service = scope.resolve::<AiService>().await;

        let request = StreamAiRequest {
            prompt: "User prompt".to_string(),
            file_id: Some(Guid::new_v4()),
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
    pub async fn stream_did_not_add_tools_when_no_file_id_is_given() {
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
                    // Only one tool for searching documents.
                    && request.tools.len() == 1
                {
                    valid_request_clone.store(true, Ordering::Relaxed);
                }

                Ok(None)
            }))),
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client, Arc::new(AiState::default())).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<AiService>().await;

        let request = StreamAiRequest {
            prompt: "User prompt".to_string(),
            file_id: None,
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
        let service = scope.resolve::<AiService>().await;
        let repository = scope.resolve::<dyn AiRepository>().await;

        let request = StreamAiRequest {
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
        let service = scope.resolve::<AiService>().await;
        let repository = scope.resolve::<dyn AiRepository>().await;

        let received_error = Arc::new(AtomicBool::new(false));
        let received_error_clone = received_error.clone();

        let request = StreamAiRequest {
            prompt: "User prompt".to_string(),
            ..Default::default()
        };

        // Act

        service
            .stream(
                request,
                Arc::new(move |event| {
                    if let StreamLlmResponseEvent::Error(error) = event {
                        received_error_clone.store(
                            error == "CompletionError: ResponseError: error from AI",
                            Ordering::Relaxed,
                        );
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
    pub async fn accept_tool_call_create_flashcard_called_correctly_and_updated_status() {
        // Arrange

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
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client, Arc::new(AiState::default())).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<AiService>().await;

        let ai_repository = scope.resolve::<dyn AiRepository>().await;
        let chat_id = Guid::new_v4();
        ai_repository
            .upsert_chat(&Chat::new(Some(chat_id), "test".to_string()))
            .await
            .unwrap();

        let file_id = scope
            .resolve::<FileSystemService>()
            .await
            .create_file(
                Some(ROOT_FOLDER_ID),
                FileSystemItemName::new_unchecked("Test".to_string()),
            )
            .await
            .unwrap();

        let args = CreateFlashcardArgs {
            question: "**Question**".to_string(),
            answer: "Answer".to_string(),
        };

        let message_id = Guid::new_v4();
        ai_repository
            .upsert_message(&Message::new(
                Some(message_id),
                chat_id,
                MessageContent::ToolCall(ToolCallContent {
                    id: "".to_string(),
                    name: CreateFlashCard::NAME.to_string(),
                    display_name: "".to_string(),
                    display_description_markdown: "".to_string(),
                    arguments: serde_json::to_value(args.clone()).unwrap(),
                    status: ToolCallStatus::Pending,
                    file_id: Some(file_id),
                }),
            ))
            .await
            .unwrap();

        // Act

        service.accept_tool_call(message_id).await.unwrap();

        // Assert

        let cells = scope
            .resolve::<dyn CellRepository>()
            .await
            .get_file_cells_ordered_by_index(file_id)
            .await
            .unwrap();
        assert_eq!(1, cells.len());

        let actual_message = scope
            .resolve::<dyn AiRepository>()
            .await
            .get_message_by_id(message_id)
            .await
            .unwrap();

        if let MessageContent::ToolCall(tool_call) = actual_message.content() {
            assert_eq!(ToolCallStatus::Accepted, tool_call.status);
        } else {
            panic!();
        }
    }

    #[tokio::test]
    pub async fn upload_document_pdf_file_uploaded_file_and_added_message() {
        // Arrange

        let mock_client = MockClient {
            embeddings_model_dims: Some(EMBEDDINGS_DIMENSIONS),
            embed_texts_fn: Arc::new(Some(Box::new(move |request| {
                if request.len() == 1 && request[0].trim() == "Page 1 content" {
                    let embeddings = Embedding {
                        document: String::new(),
                        vec: iter::once(12f64)
                            .chain(iter::repeat_n(0f64, EMBEDDINGS_DIMENSIONS - 1))
                            .collect(),
                    };

                    return Ok(vec![embeddings]);
                } else if request.len() == 1 && request[0] == "search query" {
                    let embeddings = Embedding {
                        document: String::new(),
                        vec: iter::once(11.9f64)
                            .chain(iter::repeat_n(0f64, EMBEDDINGS_DIMENSIONS - 1))
                            .collect(),
                    };

                    return Ok(vec![embeddings]);
                }
                unreachable!()
            }))),
            ..Default::default()
        };

        let injector =
            initialize_test_injector(mock_client.clone(), Arc::new(AiState::default())).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<AiService>().await;

        let ai_repository = scope.resolve::<dyn AiRepository>().await;
        let chat_id = Guid::new_v4();
        ai_repository
            .upsert_chat(&Chat::new(Some(chat_id), "test".to_string()))
            .await
            .unwrap();

        let path =
            std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/example.pdf");

        // Act

        service.upload_document(path, chat_id).await.unwrap();

        // Assert

        let messages = ai_repository
            .get_chat_messages_ordered(chat_id)
            .await
            .unwrap();
        assert_eq!(1, messages.len());
        if let MessageContent::Document(document) = messages[0].content() {
            assert_eq!(document.file_name, "example.pdf");
        } else {
            panic!("Expected document");
        }

        let multi_embedding_model = MultiEmbeddingModel::Mock(mock_client);
        let store = service
            .get_sqlite_vector_store(&multi_embedding_model)
            .await
            .unwrap();
        let index = Arc::new(store.index(multi_embedding_model));
        let search_tool = SearchDocuments::new(index, chat_id);
        let search_result = Tool::call(
            &search_tool,
            SearchDocumentsArgs {
                query: "search query".to_string(),
                top_k: 1,
            },
        )
        .await
        .unwrap();

        assert_eq!(1, search_result.len());
        assert_eq!("Page 1 content", search_result[0].content.trim());
    }
}
