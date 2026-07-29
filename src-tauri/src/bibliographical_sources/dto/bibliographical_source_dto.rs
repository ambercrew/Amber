use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::bibliographical_sources::entities::bibliographical_source::BibliographicalSource;
use crate::bibliographical_sources::services::bibliographical_source_service::{
    BibliographicalSourceFields, BibliographicalSourceWithElementCount,
};
use crate::bibliographical_sources::value_objects::bibliographical_source_type::BibliographicalSourceType;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BibliographicalSourceDto {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub title: String,
    pub authors: Option<String>,
    pub publication_date: Option<String>,
    pub source_type: BibliographicalSourceType,
    pub location: Option<String>,
}

impl From<BibliographicalSource> for BibliographicalSourceDto {
    fn from(source: BibliographicalSource) -> Self {
        BibliographicalSourceDto {
            id: source.id,
            created_at: source.created_at,
            modified_at: source.modified_at,
            title: source.title,
            authors: source.authors,
            publication_date: source.publication_date,
            source_type: source.source_type,
            location: source.location,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BibliographicalSourceResponseDto {
    #[serde(flatten)]
    pub bibliographical_source: BibliographicalSourceDto,
    pub element_count: i64,
}

impl From<BibliographicalSourceWithElementCount> for BibliographicalSourceResponseDto {
    fn from(with_count: BibliographicalSourceWithElementCount) -> Self {
        BibliographicalSourceResponseDto {
            bibliographical_source: with_count.bibliographical_source.into(),
            element_count: with_count.element_count,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BibliographicalSourceRequestDto {
    pub title: String,
    pub authors: Option<String>,
    pub publication_date: Option<String>,
    pub source_type: BibliographicalSourceType,
    pub location: Option<String>,
}

impl From<BibliographicalSourceRequestDto> for BibliographicalSourceFields {
    fn from(dto: BibliographicalSourceRequestDto) -> Self {
        BibliographicalSourceFields {
            title: dto.title,
            authors: dto.authors,
            publication_date: dto.publication_date,
            source_type: dto.source_type,
            location: dto.location,
        }
    }
}
