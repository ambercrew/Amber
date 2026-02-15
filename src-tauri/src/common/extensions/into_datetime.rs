use chrono::{DateTime, Utc};
use prost_types::Timestamp;

pub trait IntoDateTime {
    fn into_datetime(self) -> DateTime<Utc>;
}

impl IntoDateTime for Timestamp {
    fn into_datetime(self) -> DateTime<Utc> {
        DateTime::<Utc>::from_timestamp(self.seconds, 0).expect("Failed to convert timestamp")
    }
}
