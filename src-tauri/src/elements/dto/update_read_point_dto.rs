use serde::Deserialize;
use uuid::Uuid;

use crate::elements::value_objects::read_point::ReadPoint;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateReadPointDto {
    pub reading_id: Uuid,
    pub read_point: ReadPoint,
}
