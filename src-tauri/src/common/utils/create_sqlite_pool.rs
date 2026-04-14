use std::{error::Error, str::FromStr};

use sqlite_vec::sqlite3_vec_init;
use sqlx::{
    SqlitePool,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
};
use tokio::fs;
use tokio_rusqlite::ffi::sqlite3_auto_extension;

use crate::settings::value_objects::database_location::DatabaseLocation;

pub async fn create_sqlite_pool_from_location(
    database_location: &DatabaseLocation,
) -> Result<SqlitePool, Box<dyn Error>> {
    if let Some(parent) = database_location.get_path().parent() {
        fs::create_dir_all(parent).await?;
    }
    Ok(create_sqlite_pool(&format!("sqlite:///{}", database_location)).await?)
}

pub async fn create_sqlite_pool(url: &str) -> Result<SqlitePool, sqlx::Error> {
    unsafe {
        #[allow(clippy::missing_transmute_annotations)]
        sqlite3_auto_extension(Some(std::mem::transmute(sqlite3_vec_init as *const ())));
    }

    let options = SqliteConnectOptions::from_str(url)?
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
