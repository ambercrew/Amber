use serde::Deserialize;
use uuid::Uuid;

use crate::elements::entities::reading::ReadingSource;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateReadingDto {
    pub name: String,
    pub position: i64,
    pub folder_id: Uuid,
    pub source: ReadingSource,
    pub body: String,
}
