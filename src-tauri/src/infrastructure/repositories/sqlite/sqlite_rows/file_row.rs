use chrono::{DateTime, Utc};

use crate::{
    Guid,
    file_system::{entities::file::File, value_objects::file_system_item_name::FileSystemItemName},
};

pub struct FileRow {
    pub id: Guid,
    pub created_date: DateTime<Utc>,
    pub modified_date: DateTime<Utc>,
    pub parent_id: Option<Guid>,
    pub name: String,
    pub fsrs_profile_id: Option<Guid>,
}

impl From<FileRow> for File {
    fn from(value: FileRow) -> Self {
        File::new_unchecked(
            value.id,
            value.created_date,
            value.modified_date,
            value.parent_id,
            FileSystemItemName::new_unchecked(value.name.clone()),
            value.fsrs_profile_id.into(),
        )
    }
}
