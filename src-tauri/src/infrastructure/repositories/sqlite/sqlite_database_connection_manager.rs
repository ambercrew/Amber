use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    common::utils::create_sqlite_pool::create_sqlite_pool,
    database::database_connection_manager::{
        DatabaseConnectionManager, DatabaseConnectionManagerError,
    },
    infrastructure::primitives::db_pool::DbPool,
};

#[derive(ScopeInjectable)]
pub struct SqliteDatabaseConnectionManager {
    pool: Arc<DbPool>,
}

#[async_trait]
impl DatabaseConnectionManager for SqliteDatabaseConnectionManager {
    async fn change_database_location(
        &self,
        path: &str,
    ) -> Result<(), DatabaseConnectionManagerError> {
        let new_pool = match create_sqlite_pool(&format!("sqlite:///{}", path)).await {
            Err(err) => {
                return Err(DatabaseConnectionManagerError::ErrorChangingDatabase(
                    err.to_string(),
                ));
            }
            Ok(pool) => pool,
        };

        let mut pool = self.pool.lock().await;
        *pool = new_pool;

        Ok(())
    }
}
