use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::fsrs::entities::fsrs_profile::FsrsProfile;

pub struct FsrsProfileRow {
    pub id: Uuid,
    pub created_date: DateTime<Utc>,
    pub modified_date: DateTime<Utc>,
    pub name: String,
    pub request_retention: f64,
    pub maximum_interval: f64,
    pub weights: String,
}

impl From<FsrsProfileRow> for FsrsProfile {
    fn from(value: FsrsProfileRow) -> Self {
        let weights = value
            .weights
            .split(' ')
            .map(|v| v.parse().unwrap())
            .collect();
        FsrsProfile::new_unchecked(
            value.id,
            value.created_date,
            value.modified_date,
            value.name,
            value.request_retention,
            value.maximum_interval,
            weights,
        )
    }
}
