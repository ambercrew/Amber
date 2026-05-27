use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FileSystemItemType {
    File,
    Folder,
}
