use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Origin {
    Inherited,
    #[serde(rename_all = "camelCase")]
    Custom {
        #[serde(default)]
        derived_from: Option<ElementId>,
        #[serde(default)]
        bibliographical_source_id: Option<Uuid>,
    },
}
