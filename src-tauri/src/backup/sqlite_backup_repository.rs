use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    backup::repositories::traits::backup_repository::BackupRepository,
    common::repository_error::RepositoryError, infrastructure::primitives::db_pool::DbPool,
};

#[derive(ScopeInjectable)]
pub struct SqliteBackupRepository {
    pool: Arc<DbPool>,
}

#[async_trait]
impl BackupRepository for SqliteBackupRepository {
    // Cannot VACUUM within transaction, therefore pool is used here.
    async fn create_backup(&self, path: &str) -> Result<(), RepositoryError> {
        let pool = self.pool.lock().await;

        let result = sqlx::query!("VACUUM main INTO $1", path)
            .execute(&*pool)
            .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }
}
