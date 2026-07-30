use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::{
    common::repository_error::RepositoryError,
    infrastructure::value_objects::db_transaction::DbTransaction,
    sync::{
        entities::{
            deleted_entity::DeletedEntity,
            synced_entity::{EntityType, SyncedEntity},
        },
        repositories::sync_repository::SyncRepository,
    },
};

#[derive(ScopeInjectable)]
pub struct SqliteSyncRepository {
    tx: Arc<DbTransaction>,
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
            entity_created_at,
            deleted_date,
        } = deleted_entity;

        let delete_sql = format!("DELETE FROM {entity_name} WHERE id = $1");
        sqlx::query(sqlx::AssertSqlSafe(delete_sql))
            .bind(entity_id)
            .execute(&mut *tx)
            .await?;

        let result = sqlx::query!(
            r#"UPDATE deleted_entities
                SET deleted_date = datetime($1), entity_created_at = datetime($2)
                WHERE entity_name = $3 AND entity_id = $4
            "#,
            deleted_date,
            entity_created_at,
            entity_name,
            entity_id
        )
        .execute(&mut *tx)
        .await?;

        Ok(result.rows_affected())
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
                entity_created_at as "entity_created_at: _",
                deleted_date as "deleted_date: _"
            FROM deleted_entities
            WHERE deleted_date >= datetime($1)"#,
            deleted_date
        )
        .fetch_all(&mut *tx)
        .await?;

        Ok(rows.into_iter().collect())
    }

    async fn is_entity_deleted(&self, entity_id: Uuid) -> Result<bool, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let result = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM deleted_entities WHERE entity_id = $1"#,
            entity_id
        )
        .fetch_one(&mut *tx)
        .await?;

        Ok(result > 0)
    }

    async fn delete_synced_entity(&self, entity: &SyncedEntity) -> Result<(), RepositoryError> {
        let table_name = get_entity_table_name(entity.entity_type);

        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let delete_sql = format!("DELETE FROM {table_name} WHERE id = $1");
        let result = sqlx::query(sqlx::AssertSqlSafe(delete_sql))
            .bind(entity.entity_id)
            .execute(&mut *tx)
            .await?;

        if result.rows_affected() == 0 {
            let deleted_date = Utc::now();
            sqlx::query!(
                r#"INSERT INTO deleted_entities(
                    entity_name,
                    entity_id,
                    entity_created_at,
                    deleted_date)
                    VALUES ($1, $2, datetime($3), datetime($4))
                "#,
                table_name,
                entity.entity_id,
                entity.created_at,
                deleted_date,
            )
            .execute(&mut *tx)
            .await?;
        }

        Ok(())
    }
}

fn get_entity_table_name(entity_type: EntityType) -> &'static str {
    match entity_type {
        EntityType::DeletedEntity => "deleted_entities",
    }
}
