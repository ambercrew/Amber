use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    ai_integration::{
        entities::{
            chat::Chat,
            message::{Message, MessageContent},
        },
        repositories::ai_repository::AiRepository,
    },
    common::repository_error::RepositoryError,
    infrastructure::{
        primitives::db_transaction::DbTransaction,
        repositories::sqlite::sqlite_rows::{
            chat_row::ChatRow,
            message_row::{
                ASSISTANT_CONTENT_TYPE, DOCUMENT_CONTENT_TYPE, HUMAN_CONTENT_TYPE, MessageRow,
                TOOL_CALL_CONTENT_TYPE,
            },
        },
    },
};

#[derive(ScopeInjectable)]
pub struct SqliteAiRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl AiRepository for SqliteAiRepository {
    async fn get_all_chats_sorted_by_date_desc(&self) -> Result<Vec<Chat>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let chat_rows = sqlx::query_as!(
            ChatRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                title
            FROM ai_chats
            ORDER BY created_date DESC"#
        )
        .fetch_all(&mut *tx)
        .await;

        match chat_rows {
            Ok(chat_rows) => Ok(chat_rows.into_iter().map(|chat| chat.into()).collect()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn upsert_chat(&self, chat: &Chat) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let id = chat.id();
        let created_date = chat.created_date();
        let title = chat.title();

        let result = sqlx::query!(
            r#"INSERT INTO ai_chats(
                id,
                created_date,
                title)
            VALUES ($1, datetime($2), $3)
            ON CONFLICT(id) DO UPDATE
            SET id = $1,
                created_date = datetime($2),
                title = $3
            "#,
            id,
            created_date,
            title
        )
        .execute(&mut *tx)
        .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn get_chat_by_id(&self, id: Guid) -> Result<Chat, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let chat_row = sqlx::query_as!(
            ChatRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                title
            FROM ai_chats
            WHERE id = $1"#,
            id
        )
        .fetch_one(&mut *tx)
        .await;

        match chat_row {
            Ok(chat_row) => Ok(chat_row.into()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn upsert_message(&self, message: &Message) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let id = message.id();
        let created_date = message.created_date();
        let chat_id = message.chat_id();

        let content_type;
        let content;

        match message.content() {
            MessageContent::Human(content_value) => {
                content_type = HUMAN_CONTENT_TYPE.to_string();
                content = content_value.clone();
            }
            MessageContent::Assistant(content_value) => {
                content_type = ASSISTANT_CONTENT_TYPE.to_string();
                content = content_value.clone();
            }
            MessageContent::ToolCall(tool_call) => {
                content_type = TOOL_CALL_CONTENT_TYPE.to_string();
                content = serde_json::to_string(tool_call).unwrap();
            }
            MessageContent::Document(document) => {
                content_type = DOCUMENT_CONTENT_TYPE.to_string();
                content = serde_json::to_string(document).unwrap();
            }
        };

        let result = sqlx::query!(
            r#"INSERT INTO ai_messages(
                id,
                created_date,
                ai_chat_id,
                content_type,
                content)
            VALUES ($1, datetime($2), $3, $4, $5)
            ON CONFLICT(id) DO UPDATE SET
                id = $1,
                created_date = datetime($2),
                ai_chat_id = $3,
                content_type = $4,
                content = $5
            "#,
            id,
            created_date,
            chat_id,
            content_type,
            content
        )
        .execute(&mut *tx)
        .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn get_chat_messages_ordered(&self, id: Guid) -> Result<Vec<Message>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let message_rows = sqlx::query_as!(
            MessageRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                ai_chat_id as "chat_id: _",
                content_type,
                content
            FROM ai_messages
            WHERE ai_chat_id = $1
            ORDER BY created_date"#,
            id
        )
        .fetch_all(&mut *tx)
        .await;

        match message_rows {
            Ok(message_rows) => Ok(message_rows
                .into_iter()
                .map(|message| message.into())
                .collect()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn delete_chat(&self, id: Guid) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let result = sqlx::query!("DELETE FROM ai_chats WHERE id = $1", id)
            .execute(&mut *tx)
            .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn get_message_by_id(&self, id: Guid) -> Result<Message, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let message_row = sqlx::query_as!(
            MessageRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                ai_chat_id as "chat_id: _",
                content_type,
                content
            FROM ai_messages
            WHERE id = $1"#,
            id
        )
        .fetch_one(&mut *tx)
        .await;

        match message_row {
            Ok(message_row) => Ok(message_row.into()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }
}

#[cfg(test)]
pub mod tests {
    use injector::{injector::Injector, register_scope};

    use crate::{common::unit_of_work_ext::UnitOfWorkExt, test_utils::create_test_injector};

    use super::*;

    async fn get_test_dependencies() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, SqliteAiRepository);
        injector
    }

    #[tokio::test]
    pub async fn get_all_chats_sorted_by_date_desc_multiple_chats_returned_all() {
        // Arrange

        let injector = get_test_dependencies().await;
        let scope = injector.start_scope();
        let repository = scope.resolve::<SqliteAiRepository>().await;

        let chat1 = Chat::new(None, "First".to_string());
        repository.upsert_chat(&chat1).await.unwrap();
        let chat2 = Chat::new(None, "Second".to_string());
        repository.upsert_chat(&chat2).await.unwrap();

        scope.save_changes().await.unwrap();

        // Act

        let actual = repository
            .get_all_chats_sorted_by_date_desc()
            .await
            .unwrap();

        // Assert

        assert_eq!(actual.len(), 2);
        assert_eq!(actual[0].title(), "First");
        assert_eq!(actual[1].title(), "Second");
    }

    #[tokio::test]
    pub async fn get_chat_messages_ordered_multiple_messages_returned_all() {
        // Arrange

        let injector = get_test_dependencies().await;
        let scope = injector.start_scope();
        let repository = scope.resolve::<SqliteAiRepository>().await;

        let chat = Chat::new(None, "Chat".to_string());
        repository.upsert_chat(&chat).await.unwrap();

        repository
            .upsert_message(&Message::new(
                None,
                chat.id(),
                MessageContent::Human("Human".to_string()),
            ))
            .await
            .unwrap();
        repository
            .upsert_message(&Message::new(
                None,
                chat.id(),
                MessageContent::Assistant("Assistant".to_string()),
            ))
            .await
            .unwrap();

        scope.save_changes().await.unwrap();

        // Act

        let actual = repository
            .get_chat_messages_ordered(chat.id())
            .await
            .unwrap();

        // Assert

        assert_eq!(actual.len(), 2);
        assert_eq!(
            *actual[0].content(),
            MessageContent::Human("Human".to_string())
        );
        assert_eq!(
            *actual[1].content(),
            MessageContent::Assistant("Assistant".to_string())
        );
    }

    #[tokio::test]
    pub async fn delete_chat_valid_input_deleted_chat() {
        // Arrange

        let injector = get_test_dependencies().await;
        let scope = injector.start_scope();
        let repository = scope.resolve::<SqliteAiRepository>().await;

        let chat1 = Chat::new(None, "First".to_string());
        repository.upsert_chat(&chat1).await.unwrap();
        let chat2 = Chat::new(None, "Second".to_string());
        repository.upsert_chat(&chat2).await.unwrap();

        scope.save_changes().await.unwrap();

        // Act

        repository.delete_chat(chat1.id()).await.unwrap();

        // Assert

        let actual = repository
            .get_all_chats_sorted_by_date_desc()
            .await
            .unwrap();
        assert_eq!(actual.len(), 1);
        assert_eq!(actual[0].title(), "Second");
    }
}
