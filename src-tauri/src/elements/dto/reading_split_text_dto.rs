use serde::Serialize;

use crate::elements::entities::reading::ReadingSplitText;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingSplitTextDto {
    pub seq: u32,
    pub text: String,
}

impl From<ReadingSplitText> for ReadingSplitTextDto {
    fn from(text: ReadingSplitText) -> Self {
        ReadingSplitTextDto {
            seq: text.seq,
            text: text.text,
        }
    }
}
