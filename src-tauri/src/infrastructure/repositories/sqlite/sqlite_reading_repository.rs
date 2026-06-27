use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::reading::Reading;
use crate::elements::entities::reading::ReadingSource;
use crate::elements::repositories::element_repository::ElementRepository;
use crate::elements::repositories::reading_repository::ReadingRepository;
use crate::elements::value_objects::element_id::ElementId;
use crate::infrastructure::repositories::sqlite::sqlite_rows::reading_row::ReadingRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteReadingRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl ReadingRepository for SqliteReadingRepository {
    async fn create(&self, reading: Reading) -> Result<(), RepositoryError> {
        let position = reading.meta.position as i64;
        let (source_type, source_url) = match reading.source {
            ReadingSource::Website { url } => ("website".to_string(), Some(url)),
            ReadingSource::Clipboard => ("clipboard".to_string(), None),
            ReadingSource::Pdf => ("pdf".to_string(), None),
        };
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            "INSERT INTO readings (id, name, position, folder_id, created_at, modified_at, source_type, source_url, body)
             VALUES ($1, $2, $3, $4, datetime($5), datetime($6), $7, $8, $9)",
            reading.meta.id,
            reading.meta.name,
            position,
            reading.folder_id,
            reading.meta.created_at,
            reading.meta.modified_at,
            source_type,
            source_url,
            reading.body,
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }

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
                source_type,
                source_url,
                body
            FROM readings
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

#[async_trait]
impl ElementRepository for SqliteReadingRepository {
    async fn delete(&self, id: ElementId) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(r#"DELETE FROM readings WHERE id = $1"#, uuid)
            .execute(&mut *tx)
            .await?;
        Ok(())
    }

    async fn rename(&self, id: ElementId, new_name: String) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            r#"UPDATE readings SET name = $1 WHERE id = $2"#,
            new_name,
            uuid
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }
}
