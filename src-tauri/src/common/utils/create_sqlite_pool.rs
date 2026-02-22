use std::str::FromStr;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};

use crate::common::DbPool;

pub async fn create_sqlite_pool(path: &str) -> Result<DbPool, sqlx::Error> {
    let url = format!("{path}?mode=rwc");
    let options = SqliteConnectOptions::from_str(&url)?
        // Since there is a single client, we can allow read uncommitted, and use shared cache.
        .shared_cache(true)
        .pragma("read_uncommitted", "TRUE")
        .optimize_on_close(true, None);
    let pool = SqlitePoolOptions::new().connect_with(options).await?;
    sqlx::migrate!("./migrations/").run(&pool).await?;

    Ok(pool)
}
