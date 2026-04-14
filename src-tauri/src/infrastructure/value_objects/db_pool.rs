use sqlx::SqlitePool;
use tokio::sync::{Mutex, MutexGuard};

use crate::settings::value_objects::database_location::DatabaseLocation;

pub struct DbPool {
    pool: Mutex<SqlitePool>,
    location: Mutex<DatabaseLocation>,
}

impl DbPool {
    pub fn new(pool: SqlitePool, location: DatabaseLocation) -> Self {
        Self {
            pool: Mutex::new(pool),
            location: Mutex::new(location),
        }
    }

    pub async fn location(&self) -> DatabaseLocation {
        self.location.lock().await.clone()
    }

    pub async fn pool(&self) -> MutexGuard<'_, SqlitePool> {
        self.pool.lock().await
    }

    pub async fn set_pool(&self, new_pool: SqlitePool, new_location: DatabaseLocation) {
        let mut pool = self.pool.lock().await;
        *pool = new_pool;

        let mut location = self.location.lock().await;
        *location = new_location;
    }
}
