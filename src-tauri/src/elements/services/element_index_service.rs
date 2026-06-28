use async_trait::async_trait;
use fractional_index::FractionalIndex;

use crate::common::repository_error::RepositoryError;
use crate::elements::value_objects::element_id::ElementId;

#[async_trait]
pub trait ElementIndexService: Send + Sync {
    async fn get_new_last_index(
        &self,
        parent: Option<ElementId>,
    ) -> Result<FractionalIndex, RepositoryError>;
}
