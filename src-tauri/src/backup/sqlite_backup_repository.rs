use std::sync::Arc;

use async_trait::async_trait;
use sqlx::SqlitePool;

use crate::{
    backup::repositories::traits::backup_repository::BackupRepository,
    common::repository_error::RepositoryError,
};

pub struct SqliteBackupRepository {
    pool: Arc<SqlitePool>,
}

impl SqliteBackupRepository {
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl BackupRepository for SqliteBackupRepository {
    async fn create_backup(&self, path: &str) -> Result<(), RepositoryError> {
        let result = sqlx::query!("VACUUM main INTO $1", path)
            .execute(&*self.pool)
            .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }
}
