use async_trait::async_trait;
use thiserror::Error;

use crate::common::repository_error::RepositoryError;
use crate::elements::value_objects::element_id::ElementId;
use crate::sources::services::source_service::SourceWithElementCount;
use crate::study::entities::card_review::CardReview;
use crate::study::entities::reading_review::ReadingReview;
use crate::study::entities::study_profile::StudyProfile;
use crate::study::services::profile_resolution_service::{
    EffectiveProfile, ProfileResolutionError,
};

/// Everything the Aside details panel needs for a given element, gathered in
/// one round trip instead of one call per section.
#[derive(Debug, Clone, PartialEq)]
pub struct ElementDetails {
    pub source: Option<SourceWithElementCount>,
    pub derived_from_name: Option<String>,
    pub card_review: Option<CardReview>,
    pub reading_review: Option<ReadingReview>,
    pub effective_profile: EffectiveProfile,
    pub profiles: Vec<StudyProfile>,
    /// Name to show for the "inherit from parent" option: the parent's (or
    /// app-wide default's) profile name when this element's profile is
    /// direct, otherwise the effective profile's own name.
    pub inherited_profile_name: Option<String>,
}

#[async_trait]
pub trait ElementDetailsService: Send + Sync {
    async fn get_element_details(
        &self,
        element_id: ElementId,
    ) -> Result<ElementDetails, ElementDetailsError>;
}

#[derive(Debug, Error)]
pub enum ElementDetailsError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),

    #[error(transparent)]
    ProfileResolution(#[from] ProfileResolutionError),
}
