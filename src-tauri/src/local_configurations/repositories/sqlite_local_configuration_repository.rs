use std::sync::Arc;

use async_trait::async_trait;
use sqlx::{Sqlite, SqlitePool, Transaction};
use tokio::sync::Mutex;

use crate::{
    common::repository_error::RepositoryError,
    local_configurations::{
        entities::LocalConfiguration,
        repositories::{
            sqlite_local_configuration_repository::local_configuration_row::LocalConfigurationRow,
            traits::local_configuration_repository::LocalConfigurationRepository,
        },
    },
};

pub struct SqliteLocalConfigurationRepository {
    pool: Arc<SqlitePool>,
    tx: Arc<Mutex<Transaction<'static, Sqlite>>>,
}

impl SqliteLocalConfigurationRepository {
    pub fn new(pool: Arc<SqlitePool>, tx: Arc<Mutex<Transaction<'static, Sqlite>>>) -> Self {
        Self { pool, tx }
    }
}

#[async_trait]
impl LocalConfigurationRepository for SqliteLocalConfigurationRepository {
    async fn get_by_name(&self, name: &str) -> Result<Option<LocalConfiguration>, RepositoryError> {
        let row = sqlx::query_as!(
            LocalConfigurationRow,
            r#"SELECT * FROM local_configurations WHERE name = $1"#,
            name
        )
        .fetch_optional(&*self.pool)
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

mod local_configuration_row {
    use crate::local_configurations::entities::LocalConfiguration;

    pub(super) struct LocalConfigurationRow {
        pub name: String,
        pub value: String,
    }

    impl From<LocalConfigurationRow> for LocalConfiguration {
        fn from(value: LocalConfigurationRow) -> Self {
            LocalConfiguration {
                name: value.name,
                value: value.value,
            }
        }
    }
}
