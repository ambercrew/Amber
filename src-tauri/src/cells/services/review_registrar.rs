use async_trait::async_trait;
use thiserror::Error;

use crate::{
    cells::{
        dto::update_repetition_request_dto::UpdateRepetitionRequestDto, entities::review::Rating,
    },
    common::repository_error::RepositoryError,
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum ReviewRegistrarError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait ReviewRegistrar: Send + Sync {
    async fn register_review(
        &self,
        repetition_update: UpdateRepetitionRequestDto,
        rating: Rating,
        study_time: u32,
    ) -> Result<(), ReviewRegistrarError>;
}
