use serde::Serialize;

use crate::elements::services::element_details_service::ElementDetails;
use crate::sources::dto::source_dto::SourceResponseDto;
use crate::study::dto::card_review_dto::CardReviewResponseDto;
use crate::study::dto::reading_review_dto::ReadingReviewResponseDto;
use crate::study::dto::study_profile_dto::{EffectiveProfileResponseDto, StudyProfileResponseDto};

/// Everything the Aside details panel needs for the currently viewed
/// element, gathered in one round trip instead of one call per section.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ElementDetailsResponseDto {
    pub source: Option<SourceResponseDto>,
    pub derived_from_name: Option<String>,
    pub card_review: Option<CardReviewResponseDto>,
    pub reading_review: Option<ReadingReviewResponseDto>,
    pub effective_profile: EffectiveProfileResponseDto,
    pub profiles: Vec<StudyProfileResponseDto>,
    /// Name to display for the "inherit from parent" option: the parent's
    /// (or app-wide default's) profile name when this element's profile is
    /// direct, otherwise the effective profile's own name.
    pub inherited_profile_name: Option<String>,
}

impl From<ElementDetails> for ElementDetailsResponseDto {
    fn from(details: ElementDetails) -> Self {
        ElementDetailsResponseDto {
            source: details.source.map(Into::into),
            derived_from_name: details.derived_from_name,
            card_review: details.card_review.map(Into::into),
            reading_review: details.reading_review.map(Into::into),
            effective_profile: details.effective_profile.into(),
            profiles: details.profiles.into_iter().map(Into::into).collect(),
            inherited_profile_name: details.inherited_profile_name,
        }
    }
}
