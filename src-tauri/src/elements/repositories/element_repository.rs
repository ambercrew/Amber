use async_trait::async_trait;

use crate::common::repository_error::RepositoryError;
use crate::elements::value_objects::element_id::ElementId;

#[async_trait]
pub trait ElementRepository: Send + Sync {
    async fn delete(&self, id: ElementId) -> Result<(), RepositoryError>;
    async fn rename(&self, id: ElementId, new_name: String) -> Result<(), RepositoryError>;
}
