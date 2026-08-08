use chrono::{DateTime, Utc};
use prost_types::Timestamp;

pub trait IntoDateTime {
    fn into_datetime(self) -> Option<DateTime<Utc>>;
}

impl IntoDateTime for Timestamp {
    fn into_datetime(self) -> Option<DateTime<Utc>> {
        // Not using the nanos field as it is not compatible with the chrono datetime.
        DateTime::from_timestamp(self.seconds, 0)
    }
}
