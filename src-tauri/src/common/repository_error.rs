use thiserror::Error;

use crate::SourceError;

#[derive(Debug, Error)]
pub enum RepositoryError {
    #[error("The requested record was not found.")]
    NotFound(#[source] SourceError),

    #[error("A record with the same unique identifier already exists.")]
    Conflict(#[source] SourceError),

    #[error("Could not reach the database. Please try again.")]
    ConnectionFailed(#[source] SourceError),

    #[error("A database error occurred. Please try again.")]
    QueryFailed(#[source] SourceError),
}

impl PartialEq for RepositoryError {
    fn eq(&self, other: &Self) -> bool {
        std::mem::discriminant(self) == std::mem::discriminant(other)
    }
}

impl Eq for RepositoryError {}

impl From<sqlx::Error> for RepositoryError {
    fn from(err: sqlx::Error) -> Self {
        match &err {
            sqlx::Error::RowNotFound => Self::NotFound(Box::new(err)),
            sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
                Self::Conflict(Box::new(err))
            }
            sqlx::Error::Database(db_err) if db_err.is_foreign_key_violation() => {
                Self::Conflict(Box::new(err))
            }
            sqlx::Error::PoolTimedOut | sqlx::Error::PoolClosed => {
                Self::ConnectionFailed(Box::new(err))
            }
            _ => Self::QueryFailed(Box::new(err)),
        }
    }
}
