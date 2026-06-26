use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Provenance {
    Reading(Uuid),
    Extract(Uuid),
    Folder(Uuid),
}
