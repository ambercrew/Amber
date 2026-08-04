use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use rig::agent::Agent;
use rig::client::AgentClientExt;
use uuid::Uuid;

use crate::ai_integration::clients::multi_client::multi_completion_model::MultiCompletionModel;
use crate::ai_integration::entities::message::{Message, MessageContent};
use crate::ai_integration::prompts::preamble;
use crate::ai_integration::services::agent_provider::{AgentProvider, AgentProviderError};
use crate::ai_integration::services::ai_client_provider::AiClientProvider;
use crate::ai_integration::tools::search_documents::SearchDocuments;
use crate::bibliographical_sources::services::bibliographical_source_service::BibliographicalSourceService;
use crate::elements::repositories::meta_repository::MetaRepository;
use crate::elements::value_objects::element_id::ElementId;

const DEFAULT_TEMPERATURE: f64 = 0.5;
const DEFAULT_MAX_TURN: usize = 16;

#[derive(ScopeInjectable)]
pub struct DefaultAgentProvider {
    ai_client_provider: Arc<dyn AiClientProvider>,
    meta_repository: Arc<dyn MetaRepository>,
    bibliographical_source_service: Arc<dyn BibliographicalSourceService>,
}

impl DefaultAgentProvider {
    /// Builds the "**Context:**" section of the preamble: the name of the
    /// element the user is currently viewing, if relevant the bibliographical
    /// source (title + authors) it was derived from, and any text snippets
    /// the user selected and added as extra context.
    async fn build_context(
        &self,
        element_id: Option<ElementId>,
        context_snippets: &[String],
    ) -> Result<Option<String>, AgentProviderError> {
        let mut lines = Vec::new();

        if let Some(element_id) = element_id {
            let meta = self.meta_repository.get_by_id(element_id.id()).await?;
            lines.push(format!(
                "- The user is currently viewing a {} named \"{}\".",
                element_id.element_name(),
                meta.name
            ));

            if let Some(bibliographical_source_id) = meta.bibliographical_source_id {
                let source = self
                    .bibliographical_source_service
                    .get_bibliographical_source(bibliographical_source_id)
                    .await?
                    .bibliographical_source;

                let origin = match source.authors {
                    Some(authors) => format!("\"{}\" by {authors}", source.title),
                    None => format!("\"{}\"", source.title),
                };
                lines.push(format!("- It originates from {origin}."));
            }
        }

        for snippet in context_snippets {
            let snippet = snippet.trim();
            if snippet.is_empty() {
                continue;
            }
            lines.push(format!(
                "- The user selected this text as additional context: \"{snippet}\""
            ));
        }

        if lines.is_empty() {
            return Ok(None);
        }

        Ok(Some(lines.join("\n")))
    }
}

#[async_trait]
impl AgentProvider for DefaultAgentProvider {
    async fn get_agent(
        &self,
        chat_id: Uuid,
        messages: &[Message],
        element_id: Option<ElementId>,
        context_snippets: &[String],
    ) -> Result<Agent<MultiCompletionModel>, AgentProviderError> {
        let client = self.ai_client_provider.get_client().await?;
        let completion_model_name = self.ai_client_provider.get_completion_model_name().await?;
        let context = self.build_context(element_id, context_snippets).await?;

        let builder = client
            .agent(&completion_model_name)
            .temperature(DEFAULT_TEMPERATURE)
            .name("Amber Tutor")
            .default_max_turns(DEFAULT_MAX_TURN)
            .preamble(preamble(context.as_deref()).as_str());

        let has_documents = messages
            .iter()
            .any(|m| matches!(m.content(), MessageContent::Document(_)));
        if !has_documents {
            return Ok(builder.build());
        }

        let embed_model = self
            .ai_client_provider
            .get_embeddings_model(&client)
            .await?;

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

    use chrono::Utc;
    use fractional_index::FractionalIndex;
    use injector::{injector::Injector, register_scope};
    use rig::{
        OneOrMany,
        completion::{CompletionResponse, Prompt, Usage},
        message::{AssistantContent, Message as RigMessage},
    };
    use tokio::sync::Mutex;
    use uuid::Uuid;

    use crate::{
        ai_integration::{
            ai_state::AiState,
            clients::{mock_client::MockClient, multi_client::multi_response::MultiResponse},
            entities::message::{DocumentContent, Message, MessageContent},
            services::implementations::default_ai_client_provider::DefaultAiClientProvider,
        },
        bibliographical_sources::{
            repositories::bibliographical_source_repository::BibliographicalSourceRepository,
            services::implementations::default_bibliographical_source_service::DefaultBibliographicalSourceService,
        },
        elements::{repositories::meta_repository::MetaRepository, value_objects::meta::Meta},
        infrastructure::repositories::{
            disk::disk_settings_repository::DiskSettingsRepository,
            sqlite::{
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

        let agent = service
            .get_agent(Uuid::new_v4(), &messages, None, &[])
            .await
            .unwrap();
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

        let agent = service
            .get_agent(Uuid::new_v4(), &messages, None, &[])
            .await
            .unwrap();
        agent.prompt("Hello").await.unwrap();

        // Assert

        assert!(search_tool_sent.load(Ordering::Relaxed));
    }

    fn make_meta(id: ElementId, bibliographical_source_id: Option<Uuid>) -> Meta {
        Meta {
            element_id: id,
            name: "My reading".into(),
            parent: None,
            position: FractionalIndex::default(),
            priority: FractionalIndex::default(),
            derived_from: None,
            study_profile_id: None,
            bibliographical_source_id,
            created_at: Utc::now(),
            modified_at: Utc::now(),
        }
    }

    #[tokio::test]
    pub async fn get_agent_no_element_id_did_not_add_context_to_preamble() {
        // Arrange

        let preamble_has_context = Arc::new(AtomicBool::new(true));
        let preamble_has_context_clone = preamble_has_context.clone();

        let mock_client = MockClient {
            completion_fn: Arc::new(Some(Box::new(move |request| {
                let has_context = request.chat_history.iter().any(|message| {
                    matches!(
                        message,
                        RigMessage::System { content } if content.contains("**Context:**")
                    )
                });
                preamble_has_context_clone.store(has_context, Ordering::Relaxed);
                mock_response_with_text("Answer")
            }))),
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn AgentProvider>().await;

        // Act

        let agent = service
            .get_agent(Uuid::new_v4(), &[], None, &[])
            .await
            .unwrap();
        agent.prompt("Hello").await.unwrap();

        // Assert

        assert!(!preamble_has_context.load(Ordering::Relaxed));
    }

    #[tokio::test]
    pub async fn get_agent_with_element_id_added_element_and_origin_to_preamble() {
        // Arrange

        let found_context = Arc::new(AtomicBool::new(false));
        let found_context_clone = found_context.clone();

        let mock_client = MockClient {
            completion_fn: Arc::new(Some(Box::new(move |request| {
                let has_context = request.chat_history.iter().any(|message| {
                    matches!(
                        message,
                        RigMessage::System { content }
                            if content.contains("My reading")
                                && content.contains("My Book")
                                && content.contains("Jane Doe")
                    )
                });
                found_context_clone.store(has_context, Ordering::Relaxed);
                mock_response_with_text("Answer")
            }))),
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client).await;
        let scope = injector.start_scope();
        let meta_repository = scope.resolve::<dyn MetaRepository>().await;
        let bibliographical_source_service =
            scope.resolve::<dyn BibliographicalSourceService>().await;

        let bibliographical_source = bibliographical_source_service
            .create_or_reuse_bibliographical_source(
                crate::bibliographical_sources::services::bibliographical_source_service::BibliographicalSourceFields {
                    title: "My Book".into(),
                    authors: Some("Jane Doe".into()),
                    publication_date: None,
                    source_type:
                        crate::bibliographical_sources::value_objects::bibliographical_source_type::BibliographicalSourceType::File,
                    location: None,
                },
            )
            .await
            .unwrap();

        let element_id = ElementId::Reading(Uuid::new_v4());
        meta_repository
            .create_meta(&make_meta(element_id, Some(bibliographical_source.id)))
            .await
            .unwrap();

        let service = scope.resolve::<dyn AgentProvider>().await;

        // Act

        let agent = service
            .get_agent(Uuid::new_v4(), &[], Some(element_id), &[])
            .await
            .unwrap();
        agent.prompt("Hello").await.unwrap();

        // Assert

        assert!(found_context.load(Ordering::Relaxed));
    }

    #[tokio::test]
    pub async fn get_agent_with_context_snippets_added_them_to_preamble_without_element() {
        // Arrange

        let found_context = Arc::new(AtomicBool::new(false));
        let found_context_clone = found_context.clone();

        let mock_client = MockClient {
            completion_fn: Arc::new(Some(Box::new(move |request| {
                let has_context = request.chat_history.iter().any(|message| {
                    matches!(
                        message,
                        RigMessage::System { content } if content.contains("Selected passage")
                    )
                });
                found_context_clone.store(has_context, Ordering::Relaxed);
                mock_response_with_text("Answer")
            }))),
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn AgentProvider>().await;

        // Act

        let agent = service
            .get_agent(Uuid::new_v4(), &[], None, &["Selected passage".to_string()])
            .await
            .unwrap();
        agent.prompt("Hello").await.unwrap();

        // Assert

        assert!(found_context.load(Ordering::Relaxed));
    }

    #[tokio::test]
    pub async fn get_agent_with_blank_context_snippet_did_not_add_context_to_preamble() {
        // Arrange

        let preamble_has_context = Arc::new(AtomicBool::new(true));
        let preamble_has_context_clone = preamble_has_context.clone();

        let mock_client = MockClient {
            completion_fn: Arc::new(Some(Box::new(move |request| {
                let has_context = request.chat_history.iter().any(|message| {
                    matches!(
                        message,
                        RigMessage::System { content } if content.contains("**Context:**")
                    )
                });
                preamble_has_context_clone.store(has_context, Ordering::Relaxed);
                mock_response_with_text("Answer")
            }))),
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn AgentProvider>().await;

        // Act

        let agent = service
            .get_agent(Uuid::new_v4(), &[], None, &["   ".to_string()])
            .await
            .unwrap();
        agent.prompt("Hello").await.unwrap();

        // Assert

        assert!(!preamble_has_context.load(Ordering::Relaxed));
    }
}
