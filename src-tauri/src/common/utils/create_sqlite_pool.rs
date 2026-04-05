use std::str::FromStr;

use sqlite_vec::sqlite3_vec_init;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use tokio::sync::Mutex;
use tokio_rusqlite::ffi::sqlite3_auto_extension;

use crate::common::DbPool;

pub async fn create_sqlite_pool(path: &str) -> Result<DbPool, sqlx::Error> {
    unsafe {
        #[allow(clippy::missing_transmute_annotations)]
        sqlite3_auto_extension(Some(std::mem::transmute(sqlite3_vec_init as *const ())));
    }

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

    Ok(Mutex::new(pool))
}
