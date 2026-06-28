use serde::Deserialize;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DropPosition {
    Before,
    After,
    Inside,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveElementRequestDto {
    pub dragged_id: ElementId,
    pub target_id: ElementId,
    pub position: DropPosition,
}
