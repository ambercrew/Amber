use std::sync::Arc;

use async_trait::async_trait;
use sqlx::{Sqlite, Transaction};
use tokio::sync::Mutex;

use crate::{
    common::repository_error::RepositoryError, generated_code::DeletedEntity,
    sync::repositories::traits::DeletedEntityRepository,
};

pub struct SqliteDeletedEntityRepository {
    tx: Arc<Mutex<Transaction<'static, Sqlite>>>,
}

impl SqliteDeletedEntityRepository {
    pub fn new(tx: Arc<Mutex<Transaction<'static, Sqlite>>>) -> Self {
        Self { tx }
    }
}

#[async_trait]
impl DeletedEntityRepository for SqliteDeletedEntityRepository {
    async fn apply_deleted_entity(
        &self,
        deleted_entity: DeletedEntity,
    ) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let DeletedEntity {
            entity_name,
            entity_id,
            ..
        } = deleted_entity;

        // TODO: move logging to sync service, also add logging for other entities too
        log::info!("Deleting entity with entity name {entity_name} and id {entity_id}.");

        let result = sqlx::query("DELETE FROM $1 WHERE id = $2")
            .bind(entity_name)
            .bind(entity_id)
            .execute(&mut *tx)
            .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }
}
