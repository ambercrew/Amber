use crate::{
    Guid,
    cells::value_objects::file_repetitions_count::FileRepetitionCounts,
    file_system::{
        dto::review_tree_file_dto::ReviewTreeFileDto,
        value_objects::file_system_item_name::FileSystemItemName,
    },
};
use serde::Serialize;

#[derive(Clone, Debug, PartialEq, Eq, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewTreeFolderDto {
    pub id: Guid,
    pub name: FileSystemItemName,
    pub repetition_counts: FileRepetitionCounts,
    pub subfolders: Vec<ReviewTreeFolderDto>,
    pub files: Vec<ReviewTreeFileDto>,
}
