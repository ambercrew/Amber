use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::common::event_manager::EventManager;
use crate::database::transaction_manager::{TransactionManager, TransactionManagerError};
use crate::infrastructure::value_objects::{db_pool::DbPool, db_transaction::DbTransaction};

#[derive(ScopeInjectable)]
pub struct SqliteTransactionManager {
    db_transaction: Arc<DbTransaction>,
    db_pool: Arc<DbPool>,
    event_manager: Arc<dyn EventManager>,
}

#[async_trait]
impl TransactionManager for SqliteTransactionManager {
    async fn save_changes(&self) -> Result<(), TransactionManagerError> {
        let pool = self.db_pool.pool().await;
        let mut guard = self.db_transaction.lock().await;
        let new_tx = pool.begin().await.expect("Cannot create a new transaction");
        let old_tx = std::mem::replace(&mut *guard, new_tx);
        drop(guard);

        old_tx
            .commit()
            .await
            .map_err(|err| TransactionManagerError::CommitFailed(Box::new(err)))?;

        self.event_manager.emit_all().await;

        Ok(())
    }
}
