use async_trait::async_trait;
use thiserror::Error;

use crate::SourceError;

#[derive(Error, Debug)]
pub enum SecretsRepositoryError {
    #[error("Failed to save the secret!")]
    CannotSave(#[source] SourceError),
}

#[async_trait]
pub trait SecretsRepository: Send + Sync {
    async fn get_secret(&self, key: &str) -> Option<String>;
    async fn set_secret(&self, key: &str, value: &str) -> Result<(), SecretsRepositoryError>;
}
