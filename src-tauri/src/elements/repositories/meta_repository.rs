use async_trait::async_trait;
use fractional_index::FractionalIndex;

use crate::common::repository_error::RepositoryError;
use crate::elements::value_objects::element_id::ElementId;

#[async_trait]
pub trait MetaRepository: Send + Sync {
    async fn delete(&self, id: ElementId) -> Result<(), RepositoryError>;
    async fn rename(&self, id: ElementId, new_name: String) -> Result<(), RepositoryError>;
    async fn exists(&self, id: ElementId) -> Result<bool, RepositoryError>;

    /// Changes the parent and position of the given element.
    async fn move_to(
        &self,
        id: ElementId,
        new_parent: Option<ElementId>,
        new_position: FractionalIndex,
    ) -> Result<(), RepositoryError>;

    /// Returns the highest position among all elements with the given parent,
    /// or None if there are no such elements.
    async fn get_last_position(
        &self,
        parent: Option<ElementId>,
    ) -> Result<Option<FractionalIndex>, RepositoryError>;
}
