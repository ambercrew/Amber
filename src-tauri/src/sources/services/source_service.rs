use async_trait::async_trait;
use thiserror::Error;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::value_objects::element_id::ElementId;
use crate::sources::entities::source::Source;
use crate::sources::value_objects::source_type::SourceType;

/// Fields owned by the source itself and shared by every element descended
/// from it (see `Meta::derived_from` for the per-element lineage field).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceFields {
    pub title: String,
    pub authors: Option<String>,
    pub publication_date: Option<String>,
    pub source_type: SourceType,
    pub location: Option<String>,
}

/// A registry source paired with how many elements point at it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceWithElementCount {
    pub source: Source,
    pub element_count: i64,
}

#[async_trait]
pub trait SourceService: Send + Sync {
    async fn list_sources(&self) -> Result<Vec<SourceWithElementCount>, RepositoryError>;
    async fn get_source(&self, id: Uuid) -> Result<SourceWithElementCount, RepositoryError>;

    /// Creates a new source, unless one with the same `location` already
    /// exists, in which case that existing source is returned unchanged.
    /// Sources without a `location` are never deduplicated.
    async fn create_or_reuse_source(&self, fields: SourceFields)
    -> Result<Source, RepositoryError>;

    /// Edits are global: every element pointing at this source sees the
    /// change immediately.
    async fn update_source(
        &self,
        id: Uuid,
        fields: SourceFields,
    ) -> Result<Source, RepositoryError>;

    /// Never deletes elements pointing at the source; their `source_id` is
    /// cleared by the database's `ON DELETE SET NULL`.
    async fn delete_source(&self, id: Uuid) -> Result<(), RepositoryError>;

    /// Re-points the element at a different source (or clears it, with
    /// `None`) without altering either source's fields.
    async fn assign_source(
        &self,
        element_id: ElementId,
        source_id: Option<Uuid>,
    ) -> Result<(), SourceServiceError>;
}

#[derive(Debug, Error)]
pub enum SourceServiceError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}
