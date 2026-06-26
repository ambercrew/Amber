use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Provenance {
    Concept(Uuid),
    Reading(Uuid),
    Extract(Uuid),
}
