use serde::{Deserialize, Serialize};

pub const FUZZ_FACTOR_CONFIGURATION_NAME: &str = "FUZZ_FACTOR";

/// Degree of randomization applied to the priority-sorted due queue, from
/// 0 (strict priority order) to 100 (fully random).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct FuzzFactorConfiguration {
    pub fuzz_factor: u8,
}

impl Default for FuzzFactorConfiguration {
    fn default() -> Self {
        Self { fuzz_factor: 10 }
    }
}
