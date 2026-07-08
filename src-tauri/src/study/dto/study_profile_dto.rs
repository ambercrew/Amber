use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::elements::value_objects::element_id::ElementId;
use crate::study::entities::study_profile::StudyProfile;
use crate::study::services::profile_resolution_service::{EffectiveProfile, ProfileSource};
use crate::study::services::study_profile_service::StudyProfileFields;

/// `fsrs_params` is intentionally omitted: FSRS weight editing waits for the
/// optimizer and isn't exposed in v1.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudyProfileResponseDto {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub name: String,
    pub is_default: bool,
    pub desired_retention: f32,
    pub default_a_factor: f32,
    pub initial_interval_days: f32,
    pub min_interval_days: f32,
}

impl From<StudyProfile> for StudyProfileResponseDto {
    fn from(profile: StudyProfile) -> Self {
        StudyProfileResponseDto {
            id: profile.id,
            created_at: profile.created_at,
            modified_at: profile.modified_at,
            name: profile.name,
            is_default: profile.is_default,
            desired_retention: profile.desired_retention,
            default_a_factor: profile.default_a_factor,
            initial_interval_days: profile.initial_interval_days,
            min_interval_days: profile.min_interval_days,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudyProfileRequestDto {
    pub name: String,
    pub desired_retention: f32,
    pub default_a_factor: f32,
    pub initial_interval_days: f32,
    pub min_interval_days: f32,
}

impl From<StudyProfileRequestDto> for StudyProfileFields {
    fn from(dto: StudyProfileRequestDto) -> Self {
        StudyProfileFields {
            name: dto.name,
            desired_retention: dto.desired_retention,
            default_a_factor: dto.default_a_factor,
            initial_interval_days: dto.initial_interval_days,
            min_interval_days: dto.min_interval_days,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EffectiveProfileResponseDto {
    pub profile: StudyProfileResponseDto,
    pub source: &'static str,
    pub inherited_from: Option<ElementId>,
}

impl From<EffectiveProfile> for EffectiveProfileResponseDto {
    fn from(effective: EffectiveProfile) -> Self {
        let (source, inherited_from) = match effective.source {
            ProfileSource::Direct => ("direct", None),
            ProfileSource::Inherited { from } => ("inherited", Some(from)),
            ProfileSource::Default => ("default", None),
        };
        EffectiveProfileResponseDto {
            profile: effective.profile.into(),
            source,
            inherited_from,
        }
    }
}
