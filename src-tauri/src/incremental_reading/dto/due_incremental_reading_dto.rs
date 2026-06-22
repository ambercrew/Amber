use serde::Serialize;

use crate::{Guid, cells::value_objects::incremental_reading::IncrementalReadingPriority};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DueIncrementalReadingDto {
    pub cell_id: Guid,
    pub file_id: Guid,
    pub title: String,
    pub priority: IncrementalReadingPriority,
    pub has_extracts: bool,
}
