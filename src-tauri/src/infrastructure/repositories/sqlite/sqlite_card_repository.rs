use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::card::Card;
use crate::elements::repositories::card_repository::CardRepository;
use crate::infrastructure::repositories::sqlite::sqlite_rows::card_row::CardRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteCardRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl CardRepository for SqliteCardRepository {
    async fn get_all(&self) -> Result<Vec<Card>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            CardRow,
            r#"SELECT
                id as "id: _",
                name,
                position as "position: _",
                parent_type,
                parent_id as "parent_id: _",
                created_at as "created_at: _",
                modified_at as "modified_at: _",
                removed_at as "removed_at: _",
                front,
                back
            FROM cards
            WHERE removed_at IS NULL
            ORDER BY position"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let tag_rows = sqlx::query!(
            r#"SELECT
                card_id as "card_id: Uuid",
                tag_id as "tag_id: Uuid"
            FROM card_tags"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let mut tags_by_id: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for row in tag_rows {
            tags_by_id.entry(row.card_id).or_default().push(row.tag_id);
        }

        Ok(rows
            .into_iter()
            .map(|row| {
                let id = row.id;
                let mut entity: Card = row.into();
                entity.tags = tags_by_id.remove(&id).unwrap_or_default();
                entity
            })
            .collect())
    }
}
