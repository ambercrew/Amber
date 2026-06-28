use serde::Deserialize;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCardDto {
    pub name: String,
    pub parent: Option<ElementId>,
    pub front: String,
    pub back: String,
}
