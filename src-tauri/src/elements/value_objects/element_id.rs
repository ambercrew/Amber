use uuid::Uuid;

/// A kind-tagged identifier used wherever a uniform handle to *any* element is
/// needed. Field-level references keep their precise typed id so the compiler
/// still stops you from mixing them up.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ElementId {
    Folder(Uuid),
    Reading(Uuid),
    Extract(Uuid),
    Card(Uuid),
}
