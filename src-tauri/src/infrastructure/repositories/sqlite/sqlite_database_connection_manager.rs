use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    common::utils::create_sqlite_pool::create_sqlite_pool,
    database::database_connection_manager::{
        DatabaseConnectionManager, DatabaseConnectionManagerError,
    },
    infrastructure::value_objects::db_pool::DbPool,
    settings::value_objects::database_location::DatabaseLocation,
};

#[derive(ScopeInjectable)]
pub struct SqliteDatabaseConnectionManager {
    pool: Arc<DbPool>,
}

#[async_trait]
impl DatabaseConnectionManager for SqliteDatabaseConnectionManager {
    async fn change_database_location(
        &self,
        database_location: &DatabaseLocation,
    ) -> Result<(), DatabaseConnectionManagerError> {
        let new_pool = match create_sqlite_pool(&format!("sqlite:///{}", database_location)).await {
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
