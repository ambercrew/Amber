use async_trait::async_trait;
use fractional_index::FractionalIndex;
use uuid::Uuid;

use crate::elements::services::element_move_error::ElementMoveError;
use crate::elements::value_objects::element_id::ElementId;

#[async_trait]
pub trait ElementIndexService: Send + Sync {
    async fn get_new_last_index(
        &self,
        parent: Option<ElementId>,
    ) -> Result<FractionalIndex, ElementMoveError>;

    async fn get_new_before_index(&self, id: Uuid) -> Result<FractionalIndex, ElementMoveError>;

    async fn get_new_after_index(&self, id: Uuid) -> Result<FractionalIndex, ElementMoveError>;
}
