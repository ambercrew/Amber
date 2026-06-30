use std::sync::Arc;

use async_trait::async_trait;
use fractional_index::FractionalIndex;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::tag::Tag;
use crate::elements::repositories::meta_repository::MetaRepository;
use crate::elements::value_objects::element_id::ElementId;
use crate::elements::value_objects::meta::Meta;
use crate::infrastructure::repositories::sqlite::sqlite_rows::meta_row::MetaRow;
use crate::infrastructure::repositories::sqlite::sqlite_rows::tag_row::TagRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteMetaRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl MetaRepository for SqliteMetaRepository {
    async fn create_meta(&self, meta: &Meta) -> Result<(), RepositoryError> {
        let uuid = meta.element_id.id();
        let element_type = meta.element_id.element_name();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            "INSERT INTO meta (element_id, element_type, name, position, parent_id, parent_type, created_at, modified_at)
             VALUES ($1, $2, $3, $4, $5, $6, datetime($7), datetime($8))",
            uuid,
            element_type,
            meta.name,
            meta.position.as_bytes(),
            meta.parent.map(|p| p.id()),
            meta.parent.map(|p| p.element_name()),
            meta.created_at,
            meta.modified_at,
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }

    async fn get_by_id(&self, id: Uuid) -> Result<Meta, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_as!(
            MetaRow,
            r#"SELECT
                element_id as "element_id: _",
                element_type,
                name,
                position as "position: _",
                parent_id as "parent_id: _",
                parent_type,
                created_at as "created_at: _",
                modified_at as "modified_at: _"
            FROM meta
            WHERE element_id = $1"#,
            id
        )
        .fetch_one(&mut *tx)
        .await?;

        Ok(row.into())
    }

    async fn delete(&self, id: ElementId) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        sqlx::query!(r#"DELETE FROM meta WHERE element_id = $1"#, uuid)
            .execute(&mut *tx)
            .await?;

        Ok(())
    }

    async fn get_tags(&self, id: ElementId) -> Result<Vec<Tag>, RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            TagRow,
            r#"SELECT
                t.name,
                t.created_at as "created_at: _",
                t.modified_at as "modified_at: _"
            FROM tags t
            JOIN element_tags et ON et.tag_id = t.name
            WHERE et.element_id = $1
            ORDER BY et.sort_index"#,
            uuid
        )
        .fetch_all(&mut *tx)
        .await?;

        Ok(rows.into_iter().map(Tag::from).collect())
    }

    async fn update_tags(&self, id: ElementId, tags: Vec<String>) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        sqlx::query!("DELETE FROM element_tags WHERE element_id = $1", uuid)
            .execute(&mut *tx)
            .await?;

        for (sort_index, tag_name) in tags.iter().enumerate() {
            let sort_index = sort_index as i64;

            sqlx::query!("INSERT OR IGNORE INTO tags (name) VALUES ($1)", tag_name,)
                .execute(&mut *tx)
                .await?;

            sqlx::query!(
                "INSERT INTO element_tags (element_id, tag_id, sort_index) VALUES ($1, $2, $3)",
                uuid,
                tag_name,
                sort_index,
            )
            .execute(&mut *tx)
            .await?;
        }

        Ok(())
    }

    async fn rename(&self, id: ElementId, new_name: String) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            r#"UPDATE meta SET name = $1 WHERE element_id = $2"#,
            new_name,
            uuid
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }

    async fn exists(&self, id: ElementId) -> Result<bool, RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        let row = sqlx::query!(
            r#"SELECT EXISTS(SELECT 1 FROM meta WHERE element_id = $1) as "exists: bool""#,
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
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            r#"UPDATE meta SET parent_id = $1, parent_type = $2, position = $3 WHERE element_id = $4"#,
            new_parent.map(|p| p.id()),
            new_parent.map(|p| p.element_name()),
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

    async fn get_previous_sibling(&self, meta: &Meta) -> Result<Option<Meta>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_as!(
            MetaRow,
            r#"SELECT
                element_id as "element_id: _",
                element_type,
                name,
                position as "position: _",
                parent_id as "parent_id: _",
                parent_type,
                created_at as "created_at: _",
                modified_at as "modified_at: _"
            FROM meta
            WHERE parent_id IS $1 AND position < $2
            ORDER BY position DESC
            LIMIT 1"#,
            meta.parent.map(|m| m.id()),
            meta.position.as_bytes()
        )
        .fetch_optional(&mut *tx)
        .await?;

        Ok(row.map(|r| r.into()))
    }

    async fn get_next_sibling(&self, meta: &Meta) -> Result<Option<Meta>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_as!(
            MetaRow,
            r#"SELECT
                element_id as "element_id: _",
                element_type,
                name,
                position as "position: _",
                parent_id as "parent_id: _",
                parent_type,
                created_at as "created_at: _",
                modified_at as "modified_at: _"
            FROM meta
            WHERE parent_id IS $1 AND position > $2
            ORDER BY position
            LIMIT 1"#,
            meta.parent.map(|m| m.id()),
            meta.position.as_bytes()
        )
        .fetch_optional(&mut *tx)
        .await?;

        Ok(row.map(|r| r.into()))
    }

    async fn get_children_ordered(
        &self,
        parent: Option<ElementId>,
    ) -> Result<Vec<Meta>, RepositoryError> {
        let parent_id = parent.map(|p| p.id());
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        let rows = sqlx::query_as!(
            MetaRow,
            r#"SELECT
                element_id as "element_id: _",
                element_type,
                name,
                position as "position: _",
                parent_id as "parent_id: _",
                parent_type,
                created_at as "created_at: _",
                modified_at as "modified_at: _"
            FROM meta
            WHERE parent_id IS $1
            ORDER BY position"#,
            parent_id
        )
        .fetch_all(&mut *tx)
        .await?;
        Ok(rows.into_iter().map(|r| r.into()).collect())
    }
}
