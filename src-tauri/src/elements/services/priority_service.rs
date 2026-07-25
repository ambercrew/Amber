use async_trait::async_trait;
use fractional_index::FractionalIndex;
use thiserror::Error;

use crate::common::repository_error::RepositoryError;
use crate::elements::value_objects::element_id::ElementId;

/// Where an element currently stands in the global priority queue.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PriorityInfo {
    /// 1-based rank among all elements; 1 is the very front of the queue.
    pub rank: i64,
    pub total: i64,
    /// 0.00 (highest priority) .. 100.00 (lowest priority).
    pub percentage: f64,
}

#[async_trait]
pub trait PriorityService: Send + Sync {
    /// Priority for a brand new element: the front of the queue, since its
    /// real priority hasn't been triaged yet.
    async fn get_new_first_priority(&self) -> Result<FractionalIndex, PriorityError>;

    /// Priority for an element derived from (extracted out of) another one:
    /// placed immediately after the source, inheriting roughly its priority
    /// without requiring the user to re-triage every extract.
    async fn get_inherited_priority(
        &self,
        source_id: ElementId,
    ) -> Result<FractionalIndex, PriorityError>;

    async fn get_priority_info(&self, id: ElementId) -> Result<PriorityInfo, PriorityError>;

    /// Moves the element to the given 1-based rank among all elements
    /// (clamped to the valid range).
    async fn set_priority_by_rank(&self, id: ElementId, rank: i64) -> Result<(), PriorityError>;

    /// Moves the element to the given percentage (0..100, clamped) of the queue.
    async fn set_priority_by_percentage(
        &self,
        id: ElementId,
        percentage: f64,
    ) -> Result<(), PriorityError>;
}

#[derive(Debug, Error)]
pub enum PriorityError {
    #[error("No fractional index priority is available between the two adjacent elements")]
    PriorityExhausted,

    #[error(transparent)]
    Repository(#[from] RepositoryError),
}
