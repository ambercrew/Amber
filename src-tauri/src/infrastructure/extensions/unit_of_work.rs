use async_trait::async_trait;
use injector::injector_scope::InjectorScope;

use crate::database::transaction_manager::{TransactionManager, TransactionManagerError};
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[async_trait]
pub trait UnitOfWorkExt {
    async fn save_changes(&self) -> Result<(), TransactionManagerError>;
    async fn disable_foreign_key_constraint_for_current_transaction(
        &self,
    ) -> Result<(), sqlx::Error>;
}

#[async_trait]
impl<'a> UnitOfWorkExt for InjectorScope<'a> {
    async fn save_changes(&self) -> Result<(), TransactionManagerError> {
        log::info!("Saving changes");
        self.resolve::<dyn TransactionManager>()
            .await
            .save_changes()
            .await?;
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
