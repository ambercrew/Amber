use chrono::{DateTime, Utc};
use sqlx::Sqlite;

use crate::{
    Guid, cells::value_objects::incremental_reading::IncrementalReadingPriority,
    incremental_reading::scheduling::entities::incremental_reading_schedule::IncrementalReadingSchedule,
};

pub struct IncrementalReadingScheduleRow {
    pub id: Guid,
    pub created_date: DateTime<Utc>,
    pub modified_date: DateTime<Utc>,
    pub cell_id: Guid,
    pub priority: IncrementalReadingPriority,
    pub title: String,
    pub next_reading_date: DateTime<Utc>,
    pub completed: bool,
    pub has_extracts: bool,
}

impl From<IncrementalReadingScheduleRow> for IncrementalReadingSchedule {
    fn from(value: IncrementalReadingScheduleRow) -> Self {
        IncrementalReadingSchedule::new_unchecked(
            value.id,
            value.created_date,
            value.modified_date,
            value.cell_id,
            value.priority,
            value.title,
            value.next_reading_date,
            value.completed,
            value.has_extracts,
        )
    }
}

pub mod incremental_reading_priority_sqlite_impls {
    use super::*;

    impl sqlx::Type<Sqlite> for IncrementalReadingPriority {
        fn type_info() -> <Sqlite as sqlx::Database>::TypeInfo {
            <str as sqlx::Type<sqlx::Sqlite>>::type_info()
        }
    }

    impl<'r> sqlx::Decode<'r, Sqlite> for IncrementalReadingPriority {
        fn decode(
            value: <Sqlite as sqlx::Database>::ValueRef<'r>,
        ) -> Result<Self, sqlx::error::BoxDynError> {
            let value = <&'r str as sqlx::decode::Decode<'r, sqlx::sqlite::Sqlite>>::decode(value)?;
            match serde_json::from_str(value) {
                Ok(priority) => Ok(priority),
                _ => Err(format!(
                    "invalid value {:?} for enum {}",
                    value, "IncrementalReadingPriority"
                )
                .into()),
            }
        }
    }

    impl<'q> sqlx::Encode<'q, Sqlite> for IncrementalReadingPriority {
        fn encode_by_ref(
            &self,
            buf: &mut <Sqlite as sqlx::Database>::ArgumentBuffer,
        ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
            let val =
                serde_json::to_string(&self).expect("Cannot serialize IncrementalReadingPriority");
            <String as sqlx::encode::Encode<'q, Sqlite>>::encode(val, buf)
        }
    }
}
