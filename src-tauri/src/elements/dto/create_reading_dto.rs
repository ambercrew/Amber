use serde::Deserialize;

use crate::elements::{entities::reading::ReadingSource, value_objects::element_id::ElementId};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateReadingDto {
    pub name: String,
    pub parent: Option<ElementId>,
    pub source: ReadingSource,
    pub body: String,
}
