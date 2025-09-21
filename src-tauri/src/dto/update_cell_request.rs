use brainy_core::Guid;
use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCellRequest {
    pub id: Guid,
    pub content: String,
}
