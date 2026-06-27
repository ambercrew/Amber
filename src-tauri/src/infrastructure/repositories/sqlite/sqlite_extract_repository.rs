use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::extract::Extract;
use crate::elements::repositories::element_repository::ElementRepository;
use crate::elements::repositories::extract_repository::ExtractRepository;
use crate::elements::value_objects::element_id::ElementId;
use crate::elements::value_objects::extract_parent::ExtractParent;
use crate::infrastructure::repositories::sqlite::sqlite_rows::extract_row::ExtractRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteExtractRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl ExtractRepository for SqliteExtractRepository {
    async fn create(&self, extract: Extract) -> Result<(), RepositoryError> {
        let position = extract.meta.position as i64;
        let (parent_reading_id, parent_extract_id, parent_folder_id) = match extract.parent {
            ExtractParent::Reading(pid) => (Some(pid), None, None),
            ExtractParent::Extract(pid) => (None, Some(pid), None),
            ExtractParent::Folder(pid) => (None, None, Some(pid)),
        };
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            "INSERT INTO extracts (id, name, position, parent_reading_id, parent_extract_id, parent_folder_id, created_at, modified_at, text)
             VALUES ($1, $2, $3, $4, $5, $6, datetime($7), datetime($8), $9)",
            extract.meta.id,
            extract.meta.name,
            position,
            parent_reading_id,
            parent_extract_id,
            parent_folder_id,
            extract.meta.created_at,
            extract.meta.modified_at,
            extract.text,
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }

    async fn get_all(&self) -> Result<Vec<Extract>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            ExtractRow,
            r#"SELECT
                id as "id: _",
                name,
                position as "position: _",
                parent_reading_id as "parent_reading_id: _",
                parent_extract_id as "parent_extract_id: _",
                parent_folder_id as "parent_folder_id: _",
                created_at as "created_at: _",
                modified_at as "modified_at: _",
                text
            FROM extracts
            ORDER BY position"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let tag_rows = sqlx::query!(
            r#"SELECT
                extract_id as "extract_id: Uuid",
                tag_id as "tag_id: Uuid"
            FROM extract_tags"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let mut tags_by_id: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for row in tag_rows {
            tags_by_id
                .entry(row.extract_id)
                .or_default()
                .push(row.tag_id);
        }

        Ok(rows
            .into_iter()
            .map(|row| {
                let id = row.id;
                let mut entity: Extract = row.into();
                entity.tags = tags_by_id.remove(&id).unwrap_or_default();
                entity
            })
            .collect())
    }
}

#[async_trait]
impl ElementRepository for SqliteExtractRepository {
    async fn delete(&self, id: ElementId) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(r#"DELETE FROM extracts WHERE id = $1"#, uuid)
            .execute(&mut *tx)
            .await?;
        Ok(())
    }

    async fn rename(&self, id: ElementId, new_name: String) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            r#"UPDATE extracts SET name = $1 WHERE id = $2"#,
            new_name,
            uuid
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }
}
