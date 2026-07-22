use serde::Deserialize;
use uuid::Uuid;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMetaDto {
    pub name: String,
    pub parent: Option<ElementId>,
    #[serde(default)]
    pub derived_from: Option<ElementId>,
    #[serde(default)]
    pub source_id: Option<Uuid>,
}
