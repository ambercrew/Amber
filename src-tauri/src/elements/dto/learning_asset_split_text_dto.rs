use serde::Serialize;

use crate::elements::entities::learning_asset::LearningAssetSplitText;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LearningAssetSplitTextDto {
    pub seq: u32,
    pub text: String,
}

impl From<LearningAssetSplitText> for LearningAssetSplitTextDto {
    fn from(text: LearningAssetSplitText) -> Self {
        LearningAssetSplitTextDto {
            seq: text.seq,
            text: text.text,
        }
    }
}
