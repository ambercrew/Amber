use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::common::repository_error::RepositoryError;
use crate::elements::dto::move_element_dto::{DropPosition, MoveElementRequestDto};
use crate::elements::repositories::element_repository::ElementRepository;
use crate::elements::services::element_move_service::ElementMoveService;

#[derive(ScopeInjectable)]
pub struct DefaultElementMoveService {
    element_repository: Arc<dyn ElementRepository>,
}

#[async_trait]
impl ElementMoveService for DefaultElementMoveService {
    async fn move_element(&self, dto: MoveElementRequestDto) -> Result<(), RepositoryError> {
        Ok(())
    }
}
