use std::sync::Arc;

use async_trait::async_trait;
use fractional_index::FractionalIndex;
use injector_derive::ScopeInjectable;

use crate::common::repository_error::RepositoryError;
use crate::elements::repositories::meta_repository::MetaRepository;
use crate::elements::value_objects::element_id::ElementId;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteMetaRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl MetaRepository for SqliteMetaRepository {
    async fn delete(&self, id: ElementId) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        sqlx::query!(r#"DELETE FROM meta WHERE id = $1"#, uuid)
            .execute(&mut *tx)
            .await?;

        Ok(())
    }

    async fn rename(&self, id: ElementId, new_name: String) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(r#"UPDATE meta SET name = $1 WHERE id = $2"#, new_name, uuid)
            .execute(&mut *tx)
            .await?;
        Ok(())
    }

    async fn exists(&self, id: ElementId) -> Result<bool, RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        let row = sqlx::query!(
            r#"SELECT EXISTS(SELECT 1 FROM meta WHERE id = $1) as "exists: bool""#,
            uuid
        )
        .fetch_one(&mut *tx)
        .await?;
        Ok(row.exists)
    }

    async fn move_to(
        &self,
        id: ElementId,
        new_parent: Option<ElementId>,
        new_position: FractionalIndex,
    ) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let (parent_id, parent_type): (Option<uuid::Uuid>, Option<&str>) = match new_parent {
            None => (None, None),
            Some(ElementId::Folder(pid)) => (Some(pid), Some("folder")),
            Some(ElementId::Reading(pid)) => (Some(pid), Some("reading")),
            Some(ElementId::Extract(pid)) => (Some(pid), Some("extract")),
            Some(ElementId::Card(pid)) => (Some(pid), Some("card")),
        };
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            r#"UPDATE meta SET parent_id = $1, parent_type = $2, position = $3 WHERE id = $4"#,
            parent_id,
            parent_type,
            new_position.as_bytes(),
            uuid
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }

    async fn get_last_position(
        &self,
        parent: Option<ElementId>,
    ) -> Result<Option<FractionalIndex>, RepositoryError> {
        let parent_id = parent.map(|p| p.id());
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        let row = sqlx::query!(
            r#"SELECT position as "position: Vec<u8>" FROM meta WHERE parent_id IS $1 ORDER BY position DESC LIMIT 1"#,
            parent_id
        )
        .fetch_optional(&mut *tx)
        .await?;
        Ok(row.map(|r| FractionalIndex::from_bytes(r.position).expect("Invalid fractional index")))
    }
}
