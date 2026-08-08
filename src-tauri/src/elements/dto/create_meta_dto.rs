use serde::Deserialize;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMetaDto {
    pub name: String,
    pub parent: Option<ElementId>,
}
