use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;
use tokio::sync::Mutex;

use crate::{
    common::{DbTransaction, repository_error::RepositoryError},
    sync::{
        entities::deleted_entity::DeletedEntity,
        repositories::traits::sync_repository::SyncRepository,
    },
};

#[derive(ScopeInjectable)]
pub struct SqliteSyncRepository {
    tx: Arc<Mutex<DbTransaction>>,
}

#[async_trait]
impl SyncRepository for SqliteSyncRepository {
    async fn apply_deleted_entity(
        &self,
        deleted_entity: DeletedEntity,
    ) -> Result<u64, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let DeletedEntity {
            entity_name,
            entity_id,
            entity_created_date,
            deleted_date,
        } = deleted_entity;

        let result = sqlx::query(&format!("DELETE FROM {entity_name} WHERE id = $1"))
            .bind(entity_id)
            .execute(&mut *tx)
            .await;

        if let Err(err) = result {
            return Err(RepositoryError::UnknownError(err.to_string()));
        }

        let result = sqlx::query!(
            r#"UPDATE deleted_entities
                SET deleted_date = datetime($1), entity_created_date = datetime($2)
                WHERE entity_name = $3 AND entity_id = $4
            "#,
            deleted_date,
            entity_created_date,
            entity_name,
            entity_id
        )
        .execute(&mut *tx)
        .await;

        match result {
            Ok(result) => Ok(result.rows_affected()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn get_all_deleted_entities_on_or_after(
        &self,
        deleted_date: DateTime<Utc>,
    ) -> Result<Vec<DeletedEntity>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            DeletedEntity,
            r#"SELECT
                entity_id as "entity_id: _",
                entity_name,
                entity_created_date as "entity_created_date: _",
                deleted_date as "deleted_date: _"
            FROM deleted_entities
            WHERE deleted_date >= datetime($1)"#,
            deleted_date
        )
        .fetch_all(&mut *tx)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => Ok(rows.into_iter().collect()),
        }
    }
}
