use std::ops;

use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileRepetitionCounts {
    pub new: u32,
    pub learning: u32,
    pub relearning: u32,
    pub review: u32,
}

impl ops::AddAssign<&FileRepetitionCounts> for FileRepetitionCounts {
    fn add_assign(&mut self, rhs: &FileRepetitionCounts) {
        self.new += rhs.new;
        self.learning += rhs.learning;
        self.relearning += rhs.relearning;
        self.review += rhs.review;
    }
}
