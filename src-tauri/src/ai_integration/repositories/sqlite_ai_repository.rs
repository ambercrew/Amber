use std::sync::Arc;

use async_trait::async_trait;
use sqlx::{Sqlite, SqlitePool, Transaction};
use tokio::sync::Mutex;

use crate::{
    Guid,
    ai_integration::{
        entities::{
            chat::Chat,
            message::{Message, MessageRole},
        },
        repositories::{
            sqlite_ai_repository::file_row::{ASSISTANT_ROLE, ChatRow, HUMAN_ROLE, MessageRow},
            traits::ai_repository::AiRepository,
        },
    },
    common::repository_error::RepositoryError,
};

pub struct SqliteAiRepository {
    pool: Arc<SqlitePool>,
    tx: Arc<Mutex<Transaction<'static, Sqlite>>>,
}

impl SqliteAiRepository {
    pub fn new(pool: Arc<SqlitePool>, tx: Arc<Mutex<Transaction<'static, Sqlite>>>) -> Self {
        Self { pool, tx }
    }
}

#[async_trait]
impl AiRepository for SqliteAiRepository {
    async fn get_all_chats_sorted_by_date_desc(&self) -> Result<Vec<Chat>, RepositoryError> {
        let chat_rows = sqlx::query_as!(
            ChatRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                title
            FROM ai_chats
            ORDER BY created_date DESC"#
        )
        .fetch_all(&*self.pool)
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

    async fn upsert_message(&self, message: &Message) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let id = message.id();
        let created_date = message.created_date();
        let chat_id = message.chat_id();
        let role = if message.role() == MessageRole::Human {
            HUMAN_ROLE
        } else {
            ASSISTANT_ROLE
        };
        let content = message.content();

        let result = sqlx::query!(
            r#"INSERT INTO ai_messages(
                id,
                created_date,
                ai_chat_id,
                role,
                content)
            VALUES ($1, datetime($2), $3, $4, $5)
            ON CONFLICT(id) DO UPDATE SET
                id = $1,
                created_date = datetime($2),
                ai_chat_id = $3,
                role = $4,
                content = $5
            "#,
            id,
            created_date,
            chat_id,
            role,
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
        let message_rows = sqlx::query_as!(
            MessageRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                ai_chat_id as "chat_id: _",
                role,
                content
            FROM ai_messages
            WHERE ai_chat_id = $1
            ORDER BY created_date"#,
            id
        )
        .fetch_all(&*self.pool)
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
}

mod file_row {
    use chrono::{DateTime, Utc};

    use crate::ai_integration::entities::message::MessageRole;

    use super::*;

    pub(super) const HUMAN_ROLE: &str = "human";
    pub(super) const ASSISTANT_ROLE: &str = "assistant";

    pub(super) struct ChatRow {
        pub id: Guid,
        pub title: String,
        pub created_date: DateTime<Utc>,
    }

    pub(super) struct MessageRow {
        pub id: Guid,
        pub created_date: DateTime<Utc>,
        pub chat_id: Guid,
        pub role: String,
        pub content: Option<String>,
    }

    impl From<ChatRow> for Chat {
        fn from(value: ChatRow) -> Self {
            Chat::new_unchecked(value.id, value.created_date, value.title)
        }
    }

    impl From<MessageRow> for Message {
        fn from(value: MessageRow) -> Self {
            let role = if value.role == HUMAN_ROLE {
                MessageRole::Human
            } else {
                MessageRole::Assistant
            };

            Message::new_unchecked(
                value.id,
                value.created_date,
                value.chat_id,
                role,
                value.content,
            )
        }
    }
}

#[cfg(test)]
pub mod tests {
    use crate::common::{
        sqlite_repositories_context::SqliteRepositoriesContext,
        traits::repositories_context::RepositoriesContext,
    };

    use super::*;

    #[tokio::test]
    pub async fn get_all_chats_sorted_by_date_desc_multiple_chats_returned_all() {
        // Arrange

        let context = SqliteRepositoriesContext::create_testing_context().await;

        let chat1 = Chat::new(None, "First".to_string());
        context.ai_repository().upsert_chat(&chat1).await.unwrap();
        let chat2 = Chat::new(None, "Second".to_string());
        context.ai_repository().upsert_chat(&chat2).await.unwrap();

        context.save_changes().await.unwrap();

        // Act

        let actual = context
            .ai_repository()
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

        let context = SqliteRepositoriesContext::create_testing_context().await;

        let chat = Chat::new(None, "Chat".to_string());
        context.ai_repository().upsert_chat(&chat).await.unwrap();

        context
            .ai_repository()
            .upsert_message(&Message::new(
                None,
                chat.id(),
                MessageRole::Human,
                Some("Human".to_string()),
            ))
            .await
            .unwrap();
        context
            .ai_repository()
            .upsert_message(&Message::new(
                None,
                chat.id(),
                MessageRole::Assistant,
                Some("Assistant".to_string()),
            ))
            .await
            .unwrap();

        context.save_changes().await.unwrap();

        // Act

        let actual = context
            .ai_repository()
            .get_chat_messages_ordered(chat.id())
            .await
            .unwrap();

        // Assert

        assert_eq!(actual.len(), 2);
        assert_eq!(actual[0].role(), MessageRole::Human);
        assert_eq!(actual[0].content(), Some(&"Human".to_string()));

        assert_eq!(actual[1].role(), MessageRole::Assistant);
        assert_eq!(actual[1].content(), Some(&"Assistant".to_string()));
    }

    #[tokio::test]
    pub async fn delete_chat_valid_input_deleted_chat() {
        // Arrange

        let context = SqliteRepositoriesContext::create_testing_context().await;

        let chat1 = Chat::new(None, "First".to_string());
        context.ai_repository().upsert_chat(&chat1).await.unwrap();
        let chat2 = Chat::new(None, "Second".to_string());
        context.ai_repository().upsert_chat(&chat2).await.unwrap();

        context.save_changes().await.unwrap();

        // Act

        context
            .ai_repository()
            .delete_chat(chat1.id())
            .await
            .unwrap();

        // Assert

        let actual = context
            .ai_repository()
            .get_all_chats_sorted_by_date_desc()
            .await
            .unwrap();
        assert_eq!(actual.len(), 1);
        assert_eq!(actual[0].title(), "Second");
    }
}
