use crate::{Guid, cells::entities::cell::Cell};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CellWithFsrsProfileIdDto {
    pub cell: Cell,
    pub fsrs_profile_id: Guid,
}
