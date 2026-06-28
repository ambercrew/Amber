use async_trait::async_trait;

use crate::common::repository_error::RepositoryError;
use crate::elements::dto::move_element_dto::MoveElementRequestDto;

#[async_trait]
pub trait ElementMoveService: Send + Sync {
    async fn move_element(&self, dto: MoveElementRequestDto) -> Result<(), RepositoryError>;
}
