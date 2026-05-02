use std::collections::HashMap;

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeStatistics {
    /// Number of reviews done today.
    pub number_of_reviews: u64,
    /// Total time studying today.
    pub total_time: u64,
    /// Number of review counts for each day in the year.
    pub review_counts: HashMap<NaiveDate, u64>,
    /// Number of repetitions due for each day of the year.
    pub due_counts: HashMap<NaiveDate, u64>,
}
