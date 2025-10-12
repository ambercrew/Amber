use chrono::{DateTime, Utc};
use prost_types::Timestamp;

pub trait ToDateTimeExt {
    fn to_datetime_utc(&self) -> DateTime<Utc>;
}

impl ToDateTimeExt for Timestamp {
    fn to_datetime_utc(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_timestamp(self.seconds, self.nanos as u32)
            .expect("Failed to convert timestamp")
    }
}

pub trait OptionToDateTimeExt {
    fn to_datetime_utc(&self) -> Option<DateTime<Utc>>;
}

impl OptionToDateTimeExt for Option<Timestamp> {
    fn to_datetime_utc(&self) -> Option<DateTime<Utc>> {
        self.map(|v| v.to_datetime_utc())
    }
}
