use chrono::{DateTime, Utc};
use serde::Serialize;

use crate::elements::value_objects::element_id::ElementId;
use crate::trash::entities::trashed_element::TrashedElement;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashedElementResponseDto {
    pub element_id: ElementId,
    pub name: String,
    pub trashed_at: DateTime<Utc>,
    /// Elements that were trashed together with this one and come back with it.
    pub descendant_count: i64,
}

impl From<TrashedElement> for TrashedElementResponseDto {
    fn from(element: TrashedElement) -> Self {
        TrashedElementResponseDto {
            element_id: element.element_id,
            name: element.name,
            trashed_at: element.trashed_at,
            descendant_count: element.descendant_count,
        }
    }
}
