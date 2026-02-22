use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    backup::repositories::traits::backup_repository::BackupRepository,
    common::{DbPool, repository_error::RepositoryError},
};

#[derive(ScopeInjectable)]
pub struct SqliteBackupRepository {
    pool: Arc<DbPool>,
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
