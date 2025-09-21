use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum RepositoryError {
    #[error("An unknown error has happened!")]
    UnknownError(String),
}
