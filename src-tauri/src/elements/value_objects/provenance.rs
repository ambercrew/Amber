use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Provenance {
    Reading(Uuid),
    Extract(Uuid),
    Folder(Uuid),
}

impl Provenance {
    pub fn from_type_and_id(parent_type: &str, parent_id: Uuid) -> Self {
        match parent_type {
            "reading" => Provenance::Reading(parent_id),
            "extract" => Provenance::Extract(parent_id),
            _ => Provenance::Folder(parent_id),
        }
    }

    pub fn type_str(&self) -> &'static str {
        match self {
            Provenance::Reading(_) => "reading",
            Provenance::Extract(_) => "extract",
            Provenance::Folder(_) => "folder",
        }
    }

    pub fn id(&self) -> Uuid {
        match self {
            Provenance::Reading(id) | Provenance::Extract(id) | Provenance::Folder(id) => *id,
        }
    }
}
