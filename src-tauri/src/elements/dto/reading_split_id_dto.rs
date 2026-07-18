use serde::Deserialize;
use uuid::Uuid;

use crate::elements::entities::reading::ReadingSplitId;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingSplitIdDto {
    pub reading_id: Uuid,
    pub seq: u32,
}

impl From<ReadingSplitIdDto> for ReadingSplitId {
    fn from(dto: ReadingSplitIdDto) -> Self {
        ReadingSplitId {
            reading_id: dto.reading_id,
            seq: dto.seq,
        }
    }
}
