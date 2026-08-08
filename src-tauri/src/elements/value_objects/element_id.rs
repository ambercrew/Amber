use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A kind-tagged identifier used wherever a uniform handle to *any* element is
/// needed. Field-level references keep their precise typed id so the compiler
/// still stops you from mixing them up.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(tag = "type", content = "id", rename_all = "camelCase")]
pub enum ElementId {
    Folder(Uuid),
    Reading(Uuid),
    Extract(Uuid),
    Card(Uuid),
}

impl ElementId {
    pub fn id(&self) -> Uuid {
        match self {
            ElementId::Folder(id)
            | ElementId::Reading(id)
            | ElementId::Extract(id)
            | ElementId::Card(id) => *id,
        }
    }

    pub fn element_name(&self) -> &'static str {
        match self {
            ElementId::Folder(_) => "folder",
            ElementId::Reading(_) => "reading",
            ElementId::Extract(_) => "extract",
            ElementId::Card(_) => "card",
        }
    }
}
