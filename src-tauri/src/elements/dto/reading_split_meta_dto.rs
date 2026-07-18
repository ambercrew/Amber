use serde::Serialize;

use crate::elements::entities::reading::ReadingSplitMeta;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingSplitMetaDto {
    pub seq: u32,
    pub char_count: u32,
}

impl From<ReadingSplitMeta> for ReadingSplitMetaDto {
    fn from(meta: ReadingSplitMeta) -> Self {
        ReadingSplitMetaDto {
            seq: meta.seq,
            char_count: meta.char_count,
        }
    }
}
