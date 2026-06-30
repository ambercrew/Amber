use chrono::{DateTime, Utc};
use serde::Serialize;

use crate::elements::entities::tag::Tag;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagResponseDto {
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}

impl From<Tag> for TagResponseDto {
    fn from(tag: Tag) -> Self {
        TagResponseDto {
            name: tag.name,
            created_at: tag.created_at,
            modified_at: tag.modified_at,
        }
    }
}
