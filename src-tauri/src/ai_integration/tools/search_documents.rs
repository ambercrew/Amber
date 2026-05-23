use std::sync::Arc;

use rig::{
    completion::ToolDefinition,
    tool::Tool,
    vector_store::{
        VectorSearchRequest, VectorStoreError, VectorStoreIndex, request::SearchFilter,
    },
};
use rig_sqlite::{SqliteSearchFilter, SqliteVectorIndex};
use schemars::schema_for;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    Guid,
    ai_integration::{
        clients::multi_client::multi_embedding_model::MultiEmbeddingModel,
        entities::document::{CHAT_ID_COLUMN_NAME, Document},
    },
};

#[derive(Deserialize, Debug, Clone, Serialize, schemars::JsonSchema)]
pub struct SearchDocumentsArgs {
    #[schemars(
        description = "The search query or question to find relevant information in the uploaded files."
    )]
    pub query: String,
    #[schemars(description = "The maximum number of top matching results to return.")]
    pub top_k: u64,
}

#[derive(Error, Debug)]
pub enum SearchDocumentsError {
    #[error("Failed to fetch documents from the vector store")]
    Fetching(#[from] VectorStoreError),
}

pub struct SearchDocuments {
    chat_id: Guid,
    index: Arc<SqliteVectorIndex<MultiEmbeddingModel, Document>>,
}

impl SearchDocuments {
    pub fn new(
        index: Arc<SqliteVectorIndex<MultiEmbeddingModel, Document>>,
        chat_id: Guid,
    ) -> Self {
        Self { index, chat_id }
    }
}

impl Tool for SearchDocuments {
    const NAME: &'static str = "search_documents";

    type Error = SearchDocumentsError;
    type Args = SearchDocumentsArgs;
    type Output = Vec<Document>;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let parameters = serde_json::to_value(schema_for!(SearchDocumentsArgs)).unwrap();

        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Performs semantic search over the text content of \
                all files uploaded by the user. It returns relevant \
                snippets (chunks) that match the query"
                .to_string(),
            parameters,
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let filter = SqliteSearchFilter::eq(
            CHAT_ID_COLUMN_NAME,
            serde_json::to_value(self.chat_id.to_string()).unwrap(),
        );

        let req = VectorSearchRequest::builder()
            .samples(args.top_k)
            .query(args.query)
            .filter(filter)
            .build();

        let results = self
            .index
            .top_n::<Document>(req)
            .await?
            .into_iter()
            .map(|(_, _, document)| document)
            .collect::<Vec<_>>();

        Ok(results)
    }
}

#[cfg(test)]
pub mod tests {
    use std::iter;

    use rig::{OneOrMany, embeddings::Embedding};
    use rig_sqlite::SqliteVectorStore;
    use sqlite_vec::sqlite3_vec_init;
    use tokio_rusqlite::{Connection, ffi::sqlite3_auto_extension};

    use crate::ai_integration::clients::mock_client::{DEFAULT_MOCK_EMBEDDINGS_DIMS, MockClient};

    use super::*;

    fn create_embedding(chat_id: Guid, first_number: f64) -> (Document, OneOrMany<Embedding>) {
        (
            Document {
                chat_id,
                id: Guid::new_v4().to_string(),
                content: format!("{first_number}").to_string(),
            },
            OneOrMany::one(Embedding {
                document: String::new(),
                vec: iter::once(first_number)
                    .chain(iter::repeat_n(0f64, DEFAULT_MOCK_EMBEDDINGS_DIMS - 1))
                    .collect(),
            }),
        )
    }

    #[tokio::test]
    pub async fn call_multiple_documents_returned_closest_documents() {
        // Arrange

        unsafe {
            #[allow(clippy::missing_transmute_annotations)]
            sqlite3_auto_extension(Some(std::mem::transmute(sqlite3_vec_init as *const ())));
        }
        let conn = Connection::open_in_memory().await.unwrap();

        let chat_id = Guid::new_v4();
        let embed_model = MultiEmbeddingModel::Mock(MockClient {
            embed_texts_fn: Arc::new(Some(Box::new(move |request| {
                if request.len() == 1 && request[0] == "request" {
                    return Ok(vec![create_embedding(chat_id, 1.1f64).1.first()]);
                }
                unreachable!()
            }))),
            embeddings_model_dims: Some(DEFAULT_MOCK_EMBEDDINGS_DIMS),
            ..Default::default()
        });

        let vector_store = SqliteVectorStore::new(conn, &embed_model).await.unwrap();
        let embeddings: Vec<(Document, OneOrMany<Embedding>)> = vec![
            create_embedding(chat_id, 1f64),
            create_embedding(chat_id, 1.3f64),
            create_embedding(chat_id, 4f64),
        ];
        vector_store.add_rows(embeddings).await.unwrap();

        let index = Arc::new(vector_store.index(embed_model));
        let tool = SearchDocuments::new(index, chat_id);

        // Act

        let actual = tool
            .call(SearchDocumentsArgs {
                query: "request".to_string(),
                top_k: 2,
            })
            .await
            .unwrap();

        // Assert

        assert_eq!(2, actual.len());
        assert_eq!("1.3", actual[0].content);
        assert_eq!("1", actual[1].content);
    }
}
