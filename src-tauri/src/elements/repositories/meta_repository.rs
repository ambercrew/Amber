use async_trait::async_trait;
use fractional_index::FractionalIndex;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::tag::Tag;
use crate::elements::value_objects::element_id::ElementId;
use crate::elements::value_objects::meta::Meta;

#[async_trait]
pub trait MetaRepository: Send + Sync {
    async fn create_meta(&self, meta: &Meta) -> Result<(), RepositoryError>;

    async fn get_by_id(&self, id: Uuid) -> Result<Meta, RepositoryError>;

    async fn delete(&self, id: ElementId) -> Result<(), RepositoryError>;
    async fn get_tags(&self, id: ElementId) -> Result<Vec<Tag>, RepositoryError>;
    async fn update_tags(&self, id: ElementId, tags: Vec<String>) -> Result<(), RepositoryError>;
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

    /// Return the previous sibling with same parent but less position.
    async fn get_previous_sibling(&self, meta: &Meta) -> Result<Option<Meta>, RepositoryError>;

    /// Return the next sibling with same parent but bigger position.
    async fn get_next_sibling(&self, meta: &Meta) -> Result<Option<Meta>, RepositoryError>;

    /// Return all elements with the given parent, ordered by position ascending.
    async fn get_children_ordered(
        &self,
        parent: Option<ElementId>,
    ) -> Result<Vec<Meta>, RepositoryError>;
}
