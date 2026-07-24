use serde::{Deserialize, Serialize};

/// The point a reader last read up to within a reading. Device-independent.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadPoint {
    /// `seq` of the split the user last read up to.
    pub split: u32,
    /// Top-level block index within `split` that the user last read up to.
    pub block: u32,
}
