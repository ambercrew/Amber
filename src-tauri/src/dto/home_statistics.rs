use std::collections::HashMap;

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HomeStatistics {
    pub number_of_reviews: u64,
    pub total_time: i32,
    pub review_counts: HashMap<NaiveDate, i32>,
    pub due_counts: HashMap<NaiveDate, i32>,
}
