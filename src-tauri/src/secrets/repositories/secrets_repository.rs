use thiserror::Error;

use crate::SourceError;

#[derive(Error, Debug)]
pub enum SecretsRepositoryError {
    #[error("Failed to save the secret!")]
    CannotSave(#[source] SourceError),
}

pub trait SecretsRepository: Send + Sync {
    fn get_secret(&self, key: &str) -> Option<String>;
    fn set_secret(&self, key: &str, value: &str) -> Result<(), SecretsRepositoryError>;
}
