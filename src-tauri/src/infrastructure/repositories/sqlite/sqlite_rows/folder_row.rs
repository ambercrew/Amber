use chrono::{DateTime, Utc};

use crate::{
    Guid,
    file_system::{
        entities::folder::Folder, value_objects::file_system_item_name::FileSystemItemName,
    },
};

pub struct FolderRow {
    pub id: Guid,
    pub created_date: DateTime<Utc>,
    pub modified_date: DateTime<Utc>,
    pub parent_id: Option<Guid>,
    pub name: String,
    pub fsrs_profile_id: Option<Guid>,
}

impl From<FolderRow> for Folder {
    fn from(value: FolderRow) -> Self {
        Folder::new_unchecked(
            value.id,
            value.created_date,
            value.modified_date,
            value.parent_id,
            FileSystemItemName::new_unchecked(value.name),
            value.fsrs_profile_id.into(),
        )
    }
}
