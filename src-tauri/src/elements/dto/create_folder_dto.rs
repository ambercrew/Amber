use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFolderDto {
    pub name: String,
    pub position: i64,
    pub parent_folder_id: Option<Uuid>,
}
