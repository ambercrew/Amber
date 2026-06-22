use serde::Serialize;

use crate::Guid;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CellWithPendingExtractsDto {
    pub cell_id: Guid,
    pub file_id: Guid,
    pub title: String,
    pub pending_count: i64,
}
