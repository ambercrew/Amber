use async_trait::async_trait;

use crate::common::repository_error::RepositoryError;
use crate::elements::value_objects::element_id::ElementId;

#[async_trait]
pub trait DueElementsService: Send + Sync {
    /// Cards, readings and extracts due on or before the end of the current local day.
    async fn get_due_elements(&self) -> Result<Vec<ElementId>, RepositoryError>;
}
