use serde::Deserialize;
use uuid::Uuid;

use crate::elements::value_objects::reading_position::ReadingPosition;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateReadingPositionDto {
    pub reading_id: Uuid,
    pub position: ReadingPosition,
}
