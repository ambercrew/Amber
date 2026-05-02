use crate::{Guid, cells::entities::cell::CellType};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCellRequestDto {
    pub file_id: Guid,
    pub content: String,
    pub cell_type: CellType,
    pub index: u32,
}
