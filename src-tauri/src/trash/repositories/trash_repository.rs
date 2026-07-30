use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::common::repository_error::RepositoryError;
use crate::elements::value_objects::element_id::ElementId;
use crate::trash::entities::trash_state::TrashState;
use crate::trash::entities::trashed_element::TrashedElement;

#[async_trait]
pub trait TrashRepository: Send + Sync {
    /// Moves the element and its whole subtree to the trash. The element itself
    /// becomes a trash root, the descendants do not. Descendants that were
    /// already trashed on their own keep their own trash root and timestamp, so
    /// restoring this element does not resurrect them.
    async fn trash(&self, id: ElementId, trashed_at: DateTime<Utc>) -> Result<(), RepositoryError>;

    /// Takes the element and the subtree that was trashed with it back out of
    /// the trash. Descendants that are trash roots of their own stay behind.
    async fn restore(
        &self,
        id: ElementId,
        restored_at: DateTime<Utc>,
    ) -> Result<(), RepositoryError>;

    /// The elements the user explicitly trashed, most recently trashed first.
    async fn get_trashed_roots(&self) -> Result<Vec<TrashedElement>, RepositoryError>;

    /// Ids of the trash roots that were trashed strictly before `cutoff`.
    async fn get_roots_trashed_before(
        &self,
        cutoff: DateTime<Utc>,
    ) -> Result<Vec<ElementId>, RepositoryError>;

    /// Whether the element is in the trash, either because it was trashed
    /// itself or because an ancestor took it there.
    async fn is_trashed(&self, id: ElementId) -> Result<bool, RepositoryError>;

    /// Whether every ancestor of the element still exists and is out of the
    /// trash, i.e. whether the element would actually show up in the tree where
    /// it is. Used on restore to decide if the element has to be moved back to
    /// the root — a single trashed or missing ancestor anywhere up the chain
    /// hides the element, not just its immediate parent.
    async fn has_live_ancestry(&self, id: ElementId) -> Result<bool, RepositoryError>;

    /// Trash states whose `trash_modified_at` is on or after `since`, for the
    /// push phase of a sync.
    async fn get_states_modified_since(
        &self,
        since: DateTime<Utc>,
    ) -> Result<Vec<TrashState>, RepositoryError>;

    /// Applies a trash state received from the backend, ignoring it when the
    /// local state is at least as recent. Returns the number of rows written,
    /// so the syncer can tell whether the local state was overwritten.
    async fn apply_state(&self, state: TrashState) -> Result<u64, RepositoryError>;
}
