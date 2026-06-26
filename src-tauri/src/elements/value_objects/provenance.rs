use uuid::Uuid;

/// Where a derived element came from — always a Reading or an Extract, never a
/// Card.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Provenance {
    Reading(Uuid),
    Extract(Uuid),
}
