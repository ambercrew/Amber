use uuid::Uuid;

use super::traits::Element;
use crate::elements::value_objects::meta::Meta;

/// A named subject of study and a node in the concept graph.
///
/// `parents` form an acyclic parent/child DAG; children are derived by querying
/// which concepts list this one as a parent (keeps both directions from drifting
/// out of sync). Acyclicity of `parents` is enforced by operations.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Concept {
    pub meta: Meta,
    pub parents: Vec<Uuid>,
}

impl Element for Concept {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}
