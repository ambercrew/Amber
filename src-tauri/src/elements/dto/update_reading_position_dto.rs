use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateReadingPositionDto {
    pub reading_id: Uuid,
    pub position_split: u32,
    pub position_block: u32,
}
