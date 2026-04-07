use chrono::{DateTime, Utc};

use crate::{
    Guid,
    cells::entities::review::{Rating, Review},
};

pub struct ReviewRow {
    pub id: Guid,
    pub created_date: DateTime<Utc>,
    pub modified_date: DateTime<Utc>,
    pub cell_id: Option<Guid>,
    pub study_time: u32,
    pub date: DateTime<Utc>,
    pub rating: Rating,
}

impl From<ReviewRow> for Review {
    fn from(value: ReviewRow) -> Self {
        Review::new_unchecked(
            value.id,
            value.created_date,
            value.modified_date,
            value.cell_id,
            value.study_time,
            value.date,
            value.rating,
        )
    }
}

pub mod rating_sqlite_impls {
    use sqlx::Sqlite;

    use crate::cells::entities::review::Rating;

    impl sqlx::Type<Sqlite> for Rating {
        fn type_info() -> <Sqlite as sqlx::Database>::TypeInfo {
            <str as sqlx::Type<sqlx::Sqlite>>::type_info()
        }
    }

    impl<'r> sqlx::Decode<'r, Sqlite> for Rating {
        fn decode(
            value: <Sqlite as sqlx::Database>::ValueRef<'r>,
        ) -> Result<Self, sqlx::error::BoxDynError> {
            let value = <&'r str as sqlx::decode::Decode<'r, sqlx::sqlite::Sqlite>>::decode(value)?;
            match serde_json::from_str(value) {
                Ok(cell_type) => Ok(cell_type),
                _ => Err(format!("invalid value {:?} for enum {}", value, "Rating").into()),
            }
        }
    }

    impl<'q> sqlx::Encode<'q, Sqlite> for Rating {
        fn encode_by_ref(
            &self,
            buf: &mut <Sqlite as sqlx::Database>::ArgumentBuffer<'q>,
        ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
            let val = serde_json::to_string(&self).expect("Cannot serialize Rating");
            <String as sqlx::encode::Encode<'q, Sqlite>>::encode(val, buf)
        }
    }
}
