use uuid::Uuid;

use super::element_id::ElementId;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum CardParent {
    Reading(Uuid),
    Extract(Uuid),
    Folder(Uuid),
}

impl CardParent {
    pub fn from_type_and_id(parent_type: &str, parent_id: Uuid) -> Self {
        match parent_type {
            "reading" => CardParent::Reading(parent_id),
            "extract" => CardParent::Extract(parent_id),
            _ => CardParent::Folder(parent_id),
        }
    }

    pub fn type_str(&self) -> &'static str {
        match self {
            CardParent::Reading(_) => "reading",
            CardParent::Extract(_) => "extract",
            CardParent::Folder(_) => "folder",
        }
    }

    pub fn id(&self) -> Uuid {
        match self {
            CardParent::Reading(id) | CardParent::Extract(id) | CardParent::Folder(id) => *id,
        }
    }
}

impl From<CardParent> for ElementId {
    fn from(parent: CardParent) -> Self {
        match parent {
            CardParent::Reading(id) => ElementId::Reading(id),
            CardParent::Extract(id) => ElementId::Extract(id),
            CardParent::Folder(id) => ElementId::Folder(id),
        }
    }
}
