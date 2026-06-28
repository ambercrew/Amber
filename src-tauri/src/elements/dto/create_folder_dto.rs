use serde::Deserialize;
use uuid::Uuid;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFolderDto {
    pub name: String,
    pub parent: Option<ElementId>,
}
