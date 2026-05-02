use crate::Guid;
use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCellRequestDto {
    pub id: Guid,
    pub content: String,
}
