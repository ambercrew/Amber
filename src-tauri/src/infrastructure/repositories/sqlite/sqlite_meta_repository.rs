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

    async fn get_location(
        &self,
        id: ElementId,
    ) -> Result<(Option<ElementId>, FractionalIndex), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        let row = sqlx::query!(
            r#"SELECT
                parent_folder_id  as "parent_folder_id: uuid::Uuid",
                parent_reading_id as "parent_reading_id: uuid::Uuid",
                parent_extract_id as "parent_extract_id: uuid::Uuid",
                parent_card_id    as "parent_card_id: uuid::Uuid",
                position as "position: Vec<u8>"
               FROM meta WHERE id = $1"#,
            uuid
        )
        .fetch_one(&mut *tx)
        .await?;
        let parent = if let Some(pid) = row.parent_folder_id {
            Some(ElementId::Folder(pid))
        } else if let Some(pid) = row.parent_reading_id {
            Some(ElementId::Reading(pid))
        } else if let Some(pid) = row.parent_extract_id {
            Some(ElementId::Extract(pid))
        } else {
            row.parent_card_id.map(ElementId::Card)
        };
        Ok((
            parent,
            FractionalIndex::from_bytes(row.position).expect("Invalid fractional index"),
        ))
    }

    async fn move_to(
        &self,
        id: ElementId,
        new_parent: Option<ElementId>,
        new_position: FractionalIndex,
    ) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let (parent_folder_id, parent_reading_id, parent_extract_id, parent_card_id) =
            match new_parent {
                None => (None, None, None, None),
                Some(ElementId::Folder(pid)) => (Some(pid), None, None, None),
                Some(ElementId::Reading(pid)) => (None, Some(pid), None, None),
                Some(ElementId::Extract(pid)) => (None, None, Some(pid), None),
                Some(ElementId::Card(pid)) => (None, None, None, Some(pid)),
            };
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            r#"UPDATE meta
               SET parent_folder_id = $1, parent_reading_id = $2, parent_extract_id = $3, parent_card_id = $4, position = $5
               WHERE id = $6"#,
            parent_folder_id,
            parent_reading_id,
            parent_extract_id,
            parent_card_id,
            new_position.as_bytes(),
            uuid
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }
}
