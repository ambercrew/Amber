use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::sources::entities::source::Source;
use crate::sources::services::source_service::{SourceFields, SourceWithElementCount};
use crate::sources::value_objects::source_type::SourceType;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceDto {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub title: String,
    pub authors: Option<String>,
    pub publication_date: Option<String>,
    pub source_type: SourceType,
    pub location: Option<String>,
}

impl From<Source> for SourceDto {
    fn from(source: Source) -> Self {
        SourceDto {
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
pub struct SourceResponseDto {
    #[serde(flatten)]
    pub source: SourceDto,
    pub element_count: i64,
}

impl From<SourceWithElementCount> for SourceResponseDto {
    fn from(with_count: SourceWithElementCount) -> Self {
        SourceResponseDto {
            source: with_count.source.into(),
            element_count: with_count.element_count,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceRequestDto {
    pub title: String,
    pub authors: Option<String>,
    pub publication_date: Option<String>,
    pub source_type: SourceType,
    pub location: Option<String>,
}

impl From<SourceRequestDto> for SourceFields {
    fn from(dto: SourceRequestDto) -> Self {
        SourceFields {
            title: dto.title,
            authors: dto.authors,
            publication_date: dto.publication_date,
            source_type: dto.source_type,
            location: dto.location,
        }
    }
}
