use async_trait::async_trait;
use injector::injector_scope::InjectorScope;

use crate::infrastructure::value_objects::{
    db_pool::DbPool,
    db_transaction::{DbTransaction, SqliteTransaction},
};

#[async_trait]
pub trait UnitOfWorkExt {
    async fn save_changes(&self) -> Result<(), sqlx::Error>;
    async fn disable_foreign_key_constraint_for_current_transaction(
        &self,
    ) -> Result<(), sqlx::Error>;
}

#[async_trait]
impl<'a> UnitOfWorkExt for InjectorScope<'a> {
    async fn save_changes(&self) -> Result<(), sqlx::Error> {
        log::info!("Saving changes");
        let old_tx = replace_current_transaction_with_new_one(self).await;
        old_tx.commit().await?;
        log::info!("Changes saved!");
        Ok(())
    }

    async fn disable_foreign_key_constraint_for_current_transaction(
        &self,
    ) -> Result<(), sqlx::Error> {
        log::info!("Disabling foreign key constraint");

        let tx = self.resolve::<DbTransaction>().await;
        let mut tx = tx.lock().await;
        let tx = tx.as_mut();

        sqlx::query("PRAGMA defer_foreign_keys = ON")
            .fetch_optional(&mut *tx)
            .await?;

        log::info!("Foreign key constraint has been disabled");

        Ok(())
    }
}

/// Returns the old transaction.
async fn replace_current_transaction_with_new_one(scope: &InjectorScope<'_>) -> SqliteTransaction {
    let tx = scope.resolve::<DbTransaction>().await;
    let pool = scope.resolve::<DbPool>().await;
    let pool = pool.lock().await;

    let mut guard = tx.lock().await;
    let new_tx = pool.begin().await.expect("Cannot create a new transaction");
    std::mem::replace(&mut *guard, new_tx)
}
