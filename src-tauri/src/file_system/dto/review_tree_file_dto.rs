use serde::Serialize;

use crate::{
    Guid, cells::value_objects::file_repetitions_count::FileRepetitionCounts,
    file_system::value_objects::file_system_item_name::FileSystemItemName,
};

#[derive(Clone, Debug, PartialEq, Eq, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewTreeFileDto {
    pub id: Guid,
    pub name: FileSystemItemName,
    pub repetition_counts: FileRepetitionCounts,
}
