use thiserror::Error;

use crate::common::repository_error::RepositoryError;

#[derive(Debug, Error)]
pub enum ElementMoveError {
    #[error("No fractional index position is available between the two adjacent elements")]
    PositionExhausted,

    #[error(transparent)]
    Repository(#[from] RepositoryError),
}
