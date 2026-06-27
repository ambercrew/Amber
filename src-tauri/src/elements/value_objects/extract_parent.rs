use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::element_id::ElementId;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(tag = "type", content = "id", rename_all = "lowercase")]
pub enum ExtractParent {
    Reading(Uuid),
    Extract(Uuid),
    Folder(Uuid),
}

impl ExtractParent {
    pub fn from_type_and_id(parent_type: &str, parent_id: Uuid) -> Self {
        match parent_type {
            "reading" => ExtractParent::Reading(parent_id),
            "extract" => ExtractParent::Extract(parent_id),
            _ => ExtractParent::Folder(parent_id),
        }
    }

    pub fn type_str(&self) -> &'static str {
        match self {
            ExtractParent::Reading(_) => "reading",
            ExtractParent::Extract(_) => "extract",
            ExtractParent::Folder(_) => "folder",
        }
    }

    pub fn id(&self) -> Uuid {
        match self {
            ExtractParent::Reading(id) | ExtractParent::Extract(id) | ExtractParent::Folder(id) => {
                *id
            }
        }
    }
}

impl From<ExtractParent> for ElementId {
    fn from(parent: ExtractParent) -> Self {
        match parent {
            ExtractParent::Reading(id) => ElementId::Reading(id),
            ExtractParent::Extract(id) => ElementId::Extract(id),
            ExtractParent::Folder(id) => ElementId::Folder(id),
        }
    }
}
