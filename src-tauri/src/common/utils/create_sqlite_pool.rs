use std::str::FromStr;

use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};

use crate::common::DbPool;

pub async fn create_sqlite_pool(path: &str) -> Result<DbPool, sqlx::Error> {
    let options = SqliteConnectOptions::from_str(path)?
        .journal_mode(SqliteJournalMode::Wal)
        .optimize_on_close(true, None)
        .foreign_keys(true)
        .synchronous(SqliteSynchronous::Normal)
        .pragma("cache_size", "-65536")
        .pragma("temp_store", "memory")
        .create_if_missing(true);
    let pool = SqlitePoolOptions::new().connect_with(options).await?;
    sqlx::migrate!("./migrations/").run(&pool).await?;

    Ok(pool)
}
