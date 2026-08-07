use serde::Deserialize;

use super::learning_asset_split_id_dto::LearningAssetSplitIdDto;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLearningAssetDto {
    pub split_id: LearningAssetSplitIdDto,
    pub content: String,
}
