use serde::Serialize;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DueElementDto {
    pub element_id: ElementId,
    pub title: String,
}
