use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::folder::Folder;
use crate::elements::repositories::folder_repository::FolderRepository;
use crate::infrastructure::repositories::sqlite::sqlite_rows::folder_row::FolderRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteFolderRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl FolderRepository for SqliteFolderRepository {
    async fn get_all(&self) -> Result<Vec<Folder>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            FolderRow,
            r#"SELECT
                id as "id: _",
                name,
                position as "position: _",
                parent_folder_id as "parent_folder_id: _",
                created_at as "created_at: _",
                modified_at as "modified_at: _",
                removed_at as "removed_at: _"
            FROM folders
            WHERE removed_at IS NULL
            ORDER BY position"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let tag_rows = sqlx::query!(
            r#"SELECT
                folder_id as "folder_id: Uuid",
                tag_id as "tag_id: Uuid"
            FROM folder_tags"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let mut tags_by_id: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for row in tag_rows {
            tags_by_id
                .entry(row.folder_id)
                .or_default()
                .push(row.tag_id);
        }

        Ok(rows
            .into_iter()
            .map(|row| {
                let id = row.id;
                let mut entity: Folder = row.into();
                entity.tags = tags_by_id.remove(&id).unwrap_or_default();
                entity
            })
            .collect())
    }
}
