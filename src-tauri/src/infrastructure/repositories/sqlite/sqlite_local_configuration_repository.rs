use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    common::repository_error::RepositoryError,
    infrastructure::{
        primitives::db_transaction::DbTransaction,
        repositories::sqlite::sqlite_rows::local_configuration_row::LocalConfigurationRow,
    },
    local_configurations::{
        entities::local_configuration::LocalConfiguration,
        repositories::local_configuration_repository::LocalConfigurationRepository,
    },
};

#[derive(ScopeInjectable)]
pub struct SqliteLocalConfigurationRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl LocalConfigurationRepository for SqliteLocalConfigurationRepository {
    async fn get_by_name(&self, name: &str) -> Result<Option<LocalConfiguration>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_as!(
            LocalConfigurationRow,
            r#"SELECT * FROM local_configurations WHERE name = $1"#,
            name
        )
        .fetch_optional(&mut *tx)
        .await;

        match row {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(row) => Ok(row.map(|value| value.into())),
        }
    }

    async fn upsert(&self, configuration: &LocalConfiguration) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let result = sqlx::query!(
            r#"INSERT INTO local_configurations(name, value) VALUES ($1, $2)
            ON CONFLICT(name) DO UPDATE
            SET name = $1, value = $2
            "#,
            configuration.name,
            configuration.value
        )
        .execute(&mut *tx)
        .await;

        if let Err(err) = result {
            return Err(RepositoryError::UnknownError(err.to_string()));
        }

        Ok(())
    }
}
