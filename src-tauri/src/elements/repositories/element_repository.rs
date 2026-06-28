use async_trait::async_trait;
use fractional_index::FractionalIndex;

use crate::common::repository_error::RepositoryError;
use crate::elements::value_objects::element_id::ElementId;

#[async_trait]
pub trait ElementRepository: Send + Sync {
    async fn delete(&self, id: ElementId) -> Result<(), RepositoryError>;
    async fn rename(&self, id: ElementId, new_name: String) -> Result<(), RepositoryError>;
    async fn exists(&self, id: ElementId) -> Result<bool, RepositoryError>;

    /// Returns (parent_id, current_position) of the given element.
    /// parent_id is None for root-level folders.
    // TODO: how will this work with fractional indexing
    async fn get_location(
        &self,
        id: ElementId,
    ) -> Result<(Option<ElementId>, FractionalIndex), RepositoryError>;

    /// Changes the parent and position of the given element.
    /// new_parent = None is only valid for folders (root level).
    async fn move_to(
        &self,
        id: ElementId,
        new_parent: Option<ElementId>,
        new_position: FractionalIndex,
    ) -> Result<(), RepositoryError>;

    // TODO: max child position method for create methods?
}
