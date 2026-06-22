use chrono::{DateTime, Utc};
use sqlx::Sqlite;

use crate::{
    Guid,
    incremental_reading::extracts::entities::extract::{Extract, ExtractStatus},
};

pub struct ExtractRow {
    pub id: Guid,
    pub created_date: DateTime<Utc>,
    pub modified_date: DateTime<Utc>,
    pub cell_id: Guid,
    pub status: ExtractStatus,
}

impl From<ExtractRow> for Extract {
    fn from(value: ExtractRow) -> Self {
        Extract::new_unchecked(
            value.id,
            value.created_date,
            value.modified_date,
            value.cell_id,
            value.status,
        )
    }
}

pub mod extract_status_sqlite_impls {
    use super::*;

    impl sqlx::Type<Sqlite> for ExtractStatus {
        fn type_info() -> <Sqlite as sqlx::Database>::TypeInfo {
            <str as sqlx::Type<sqlx::Sqlite>>::type_info()
        }
    }

    impl<'r> sqlx::Decode<'r, Sqlite> for ExtractStatus {
        fn decode(
            value: <Sqlite as sqlx::Database>::ValueRef<'r>,
        ) -> Result<Self, sqlx::error::BoxDynError> {
            let value = <&'r str as sqlx::decode::Decode<'r, sqlx::sqlite::Sqlite>>::decode(value)?;
            match serde_json::from_str(value) {
                Ok(status) => Ok(status),
                _ => Err(format!("invalid value {:?} for enum {}", value, "ExtractStatus").into()),
            }
        }
    }

    impl<'q> sqlx::Encode<'q, Sqlite> for ExtractStatus {
        fn encode_by_ref(
            &self,
            buf: &mut <Sqlite as sqlx::Database>::ArgumentBuffer,
        ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
            let val = serde_json::to_string(&self).expect("Cannot serialize ExtractStatus");
            <String as sqlx::encode::Encode<'q, Sqlite>>::encode(val, buf)
        }
    }
}
