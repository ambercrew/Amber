use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::reading::Reading;
use crate::elements::repositories::reading_repository::ReadingRepository;
use crate::infrastructure::repositories::sqlite::sqlite_rows::reading_row::ReadingRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteReadingRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl ReadingRepository for SqliteReadingRepository {
    async fn get_all(&self) -> Result<Vec<Reading>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            ReadingRow,
            r#"SELECT
                id as "id: _",
                name,
                position as "position: _",
                folder_id as "folder_id: _",
                created_at as "created_at: _",
                modified_at as "modified_at: _",
                removed_at as "removed_at: _",
                source_type,
                source_url,
                body
            FROM readings
            WHERE removed_at IS NULL
            ORDER BY position"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let tag_rows = sqlx::query!(
            r#"SELECT
                reading_id as "reading_id: Uuid",
                tag_id as "tag_id: Uuid"
            FROM reading_tags"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let mut tags_by_id: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for row in tag_rows {
            tags_by_id
                .entry(row.reading_id)
                .or_default()
                .push(row.tag_id);
        }

        Ok(rows
            .into_iter()
            .map(|row| {
                let id = row.id;
                let mut entity: Reading = row.into();
                entity.tags = tags_by_id.remove(&id).unwrap_or_default();
                entity
            })
            .collect())
    }
}
