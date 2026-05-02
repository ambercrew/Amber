use chrono::{DateTime, Utc};
use prost_types::Timestamp;

pub trait IntoTimestamp {
    fn into_timestamp(self) -> Timestamp;
}

impl IntoTimestamp for DateTime<Utc> {
    fn into_timestamp(self) -> Timestamp {
        Timestamp {
            seconds: self.timestamp(),
            nanos: self.timestamp_subsec_nanos() as i32,
        }
    }
}
