use std::path::PathBuf;
use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use rig::client::EmbeddingsClient;
use rig::embeddings::EmbeddingsBuilder;
use rig::loaders::{FileLoader, PdfFileLoader};
use text_splitter::{ChunkConfig, TextSplitter};

use crate::Guid;
use crate::ai_integration::entities::document::Document;
use crate::ai_integration::entities::message::{self, Message, MessageContent};
use crate::ai_integration::repositories::ai_repository::AiRepository;
use crate::ai_integration::services::ai_client_provider::AiClientProvider;
use crate::ai_integration::services::document_uploader::{DocumentUploader, DocumentUploaderError};

#[derive(ScopeInjectable)]
pub struct DefaultDocumentUploader {
    ai_repository: Arc<dyn AiRepository>,
    ai_client_provider: Arc<dyn AiClientProvider>,
}

#[async_trait]
impl DocumentUploader for DefaultDocumentUploader {
    async fn upload_document(
        &self,
        path: PathBuf,
        chat_id: Guid,
    ) -> Result<(), DocumentUploaderError> {
        let embeddings_model_name = self.ai_client_provider.get_embeddings_model_name().await?;

        let embed_model = self
            .ai_client_provider
            .get_client()
            .await?
            .embedding_model(embeddings_model_name);

        let mut embeddings_builder = EmbeddingsBuilder::new(embed_model.clone());
        let splitter = TextSplitter::new(ChunkConfig::new(512).with_trim(false));

        if let Some(extension) = path.extension()
            && extension == "pdf"
        {
            let path = &path.to_string_lossy();
            let loader = PdfFileLoader::with_glob(path)?;

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
            let path = &path.to_string_lossy();
            let loader = FileLoader::with_glob(path)?;

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

        let vector_store = self
            .ai_client_provider
            .get_vector_store(&embed_model)
            .await?;
        vector_store.add_rows(embeddings).await?;

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
}

#[cfg(test)]
pub mod tests {
    use std::{iter, sync::Arc};

    use injector::{injector::Injector, register_scope};
    use rig::{embeddings::Embedding, tool::Tool};
    use tokio::sync::Mutex;

    use crate::{
        Guid,
        ai_integration::{
            clients::{
                mock_client::{DEFAULT_MOCK_EMBEDDINGS_DIMS, MockClient},
                multi_client::multi_embedding_model::MultiEmbeddingModel,
            },
            entities::{chat::Chat, message::MessageContent},
            repositories::ai_repository::AiRepository,
            services::{
                document_uploader::DocumentUploader,
                implementations::default_ai_client_provider::DefaultAiClientProvider,
            },
            tools::search_documents::{SearchDocuments, SearchDocumentsArgs},
        },
        infrastructure::repositories::{
            disk::disk_settings_repository::DiskSettingsRepository,
            sqlite::sqlite_ai_repository::SqliteAiRepository,
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

        register_scope!(injector, dyn SettingsRepository, DiskSettingsRepository);
        register_scope!(injector, dyn AiRepository, SqliteAiRepository);
        register_scope!(injector, dyn AiClientProvider, DefaultAiClientProvider);
        register_scope!(injector, dyn DocumentUploader, DefaultDocumentUploader);

        injector
    }

    #[tokio::test]
    pub async fn upload_document_pdf_file_uploaded_file_and_added_message() {
        // Arrange

        let mock_client = MockClient {
            embeddings_model_dims: Some(DEFAULT_MOCK_EMBEDDINGS_DIMS),
            embed_texts_fn: Arc::new(Some(Box::new(move |request| {
                if request.len() == 1 && request[0].trim() == "Page 1 content" {
                    let embeddings = Embedding {
                        document: String::new(),
                        vec: iter::once(12f64)
                            .chain(iter::repeat_n(0f64, DEFAULT_MOCK_EMBEDDINGS_DIMS - 1))
                            .collect(),
                    };

                    return Ok(vec![embeddings]);
                } else if request.len() == 1 && request[0] == "search query" {
                    let embeddings = Embedding {
                        document: String::new(),
                        vec: iter::once(11.9f64)
                            .chain(iter::repeat_n(0f64, DEFAULT_MOCK_EMBEDDINGS_DIMS - 1))
                            .collect(),
                    };

                    return Ok(vec![embeddings]);
                }
                unreachable!()
            }))),
            ..Default::default()
        };

        let injector = initialize_test_injector(mock_client.clone()).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn DocumentUploader>().await;

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
        let store = scope
            .resolve::<dyn AiClientProvider>()
            .await
            .get_vector_store(&multi_embedding_model)
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
