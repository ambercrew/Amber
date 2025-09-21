use std::{str::FromStr, sync::Arc};

use async_trait::async_trait;
use sqlx::{
    Sqlite, SqlitePool, Transaction,
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
};
use thiserror::Error;
use tokio::sync::Mutex;

use crate::{
    cells::repositories::{
        sqlite_cell_repository::SqliteCellRepository,
        sqlite_review_repository::SqliteReviewRepository,
        traits::{cell_repository::CellRepository, review_repository::ReviewRepository},
    },
    common::traits::repositories_context::{RepositoriesContext, RepositoriesContextError},
    file_system::repositories::{
        sqlite_file_repository::SqliteFileRepository,
        sqlite_folder_repository::SqliteFolderRepository,
        traits::{file_repository::FileRepository, folder_repository::FolderRepository},
    },
};

pub struct SqliteRepositoriesContext {
    pool: Arc<SqlitePool>,
    tx: Arc<Mutex<Transaction<'static, Sqlite>>>,
    folder_repository: Arc<SqliteFolderRepository>,
    file_repository: Arc<SqliteFileRepository>,
    cell_repository: Arc<SqliteCellRepository>,
    review_repository: Arc<SqliteReviewRepository>,
}

#[derive(Debug, Error)]
pub enum SqliteRepositoriesContextError {
    #[error("{0}")]
    RepositoriesContextError(#[from] RepositoriesContextError),
    #[error("Sqlx error: {0}")]
    SqlxError(#[from] sqlx::Error),
    #[error("Migration error")]
    MigrationError(#[from] sqlx::migrate::MigrateError),
}

impl SqliteRepositoriesContext {
    /// Creates a new instance with the url provided, be aware the the migrations
    /// are automatically applied!
    pub async fn new_with_migration(path: &str) -> Result<Self, SqliteRepositoriesContextError> {
        let url = format!("{path}?mode=rwc");
        let options = SqliteConnectOptions::from_str(&url)?;
        let pool = SqlitePoolOptions::new().connect_with(options).await?;
        sqlx::migrate!("./db/").run(&pool).await?;

        let arc_pool = Arc::new(pool);
        let tx = Arc::new(Mutex::new(create_transaction(arc_pool.clone()).await));

        Ok(Self {
            pool: arc_pool.clone(),
            tx: tx.clone(),
            file_repository: Arc::new(SqliteFileRepository::new(arc_pool.clone(), tx.clone())),
            folder_repository: Arc::new(SqliteFolderRepository::new(arc_pool.clone(), tx.clone())),
            cell_repository: Arc::new(SqliteCellRepository::new(arc_pool.clone(), tx.clone())),
            review_repository: Arc::new(SqliteReviewRepository::new(tx.clone())),
        })
    }

    #[cfg(test)]
    /// Creates an in-memory context with migration for testing.
    pub async fn create_testing_context() -> Self {
        SqliteRepositoriesContext::new_with_migration("sqlite::memory:")
            .await
            .unwrap()
    }
}

#[async_trait]
impl RepositoriesContext for SqliteRepositoriesContext {
    fn folder_repository(&self) -> Arc<dyn FolderRepository> {
        self.folder_repository.clone()
    }

    fn file_repository(&self) -> Arc<dyn FileRepository> {
        self.file_repository.clone()
    }

    fn cell_repository(&self) -> Arc<dyn CellRepository> {
        self.cell_repository.clone()
    }

    fn review_repository(&self) -> Arc<dyn ReviewRepository> {
        self.review_repository.clone()
    }

    async fn save_changes(&mut self) -> Result<(), RepositoriesContextError> {
        log::info!("Saving changes");
        let mut guard = self.tx.lock().await;

        let new_tx = create_transaction(self.pool.clone()).await;
        let old_tx = std::mem::replace(&mut *guard, new_tx);

        if let Err(err) = old_tx.commit().await {
            return Err(RepositoriesContextError::UnknownError(err.to_string()));
        }
        Ok(())
    }
}

async fn create_transaction(pool: Arc<SqlitePool>) -> Transaction<'static, Sqlite> {
    log::info!("Starting new transaction");
    pool.begin().await.expect("Cannot create a new transaction")
}
