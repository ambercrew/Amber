use std::collections::{HashMap, HashSet};

use chrono::{DateTime, Utc};

use crate::{
    Guid,
    cells::entities::{
        cell::{Cell, CellType},
        repetition::{Repetition, State},
    },
};

#[derive(Debug)]
/// Used to select cells with left join on repetitions.
pub struct CellRow {
    // Cell fields
    pub cell_id: Guid,
    pub cell_created_date: DateTime<Utc>,
    pub cell_modified_date: DateTime<Utc>,
    pub cell_file_id: Guid,
    pub cell_content: String,
    pub cell_type: CellType,
    pub cell_index: u32,
    pub cell_searchable_content: String,

    // Repetition fields
    pub repetition_id: Option<Guid>,
    pub repetition_created_date: Option<DateTime<Utc>>,
    pub repetition_modified_date: Option<DateTime<Utc>>,
    pub repetition_file_id: Option<Guid>,
    pub repetition_cell_id: Option<Guid>,
    pub repetition_due: Option<DateTime<Utc>>,
    pub repetition_stability: Option<f64>,
    pub repetition_difficulty: Option<f64>,
    pub repetition_elapsed_days: Option<i64>,
    pub repetition_scheduled_days: Option<i64>,
    pub repetition_reps: Option<i64>,
    pub repetition_lapses: Option<i64>,
    pub repetition_state: Option<State>,
    pub repetition_last_review: Option<DateTime<Utc>>,
    pub repetition_additional_content: Option<String>,
}

/// Used to select only repetitions.
pub struct RepetitionRow {
    pub id: Guid,
    pub created_date: DateTime<Utc>,
    pub modified_date: DateTime<Utc>,
    pub file_id: Guid,
    pub cell_id: Guid,
    pub due: DateTime<Utc>,
    pub stability: f64,
    pub difficulty: f64,
    pub elapsed_days: i64,
    pub scheduled_days: i64,
    pub reps: i64,
    pub lapses: i64,
    pub state: State,
    pub last_review: Option<DateTime<Utc>>,
    pub additional_content: Option<String>,
}

impl From<RepetitionRow> for Repetition {
    fn from(value: RepetitionRow) -> Self {
        Repetition {
            id: value.id,
            created_date: value.created_date,
            modified_date: value.modified_date,
            file_id: value.file_id,
            cell_id: value.cell_id,
            due: value.due,
            stability: value.stability,
            difficulty: value.difficulty,
            elapsed_days: value.elapsed_days,
            scheduled_days: value.scheduled_days,
            reps: value.reps,
            lapses: value.lapses,
            state: value.state,
            last_review: value.last_review,
            additional_content: value.additional_content,
        }
    }
}

pub fn convert_rows_to_cells(rows: Vec<CellRow>) -> Vec<Cell> {
    let mut cells_repetitions: HashMap<Guid, Vec<Repetition>> = HashMap::new();

    for row in &rows {
        if row.repetition_id.is_none() {
            continue;
        }

        let repetition = Repetition {
            id: row.repetition_id.unwrap(),
            created_date: row.repetition_created_date.unwrap(),
            modified_date: row.repetition_modified_date.unwrap(),
            file_id: row.repetition_file_id.unwrap(),
            cell_id: row.repetition_cell_id.unwrap(),
            due: row.repetition_due.unwrap(),
            stability: row.repetition_stability.unwrap(),
            difficulty: row.repetition_difficulty.unwrap(),
            elapsed_days: row.repetition_elapsed_days.unwrap(),
            scheduled_days: row.repetition_scheduled_days.unwrap(),
            reps: row.repetition_reps.unwrap(),
            lapses: row.repetition_lapses.unwrap(),
            state: row.repetition_state.clone().unwrap(),
            last_review: row.repetition_last_review,
            additional_content: row.repetition_additional_content.clone(),
        };

        cells_repetitions
            .entry(row.cell_id)
            .or_default()
            .push(repetition);
    }

    let mut added_cells: HashSet<Guid> = HashSet::new();
    let mut result = Vec::new();

    for row in rows {
        if added_cells.insert(row.cell_id) {
            let cell = Cell::new_unchecked(
                row.cell_id,
                row.cell_created_date,
                row.cell_modified_date,
                row.cell_file_id,
                row.cell_content,
                row.cell_type,
                row.cell_index,
                row.cell_searchable_content,
                cells_repetitions.remove(&row.cell_id).unwrap_or_default(),
            );
            result.push(cell);
        }
    }

    result
}

pub mod cell_type_sqlite_impls {
    use sqlx::Sqlite;

    use super::*;

    impl sqlx::Type<Sqlite> for CellType {
        fn type_info() -> <Sqlite as sqlx::Database>::TypeInfo {
            <str as sqlx::Type<sqlx::Sqlite>>::type_info()
        }
    }

    impl<'r> sqlx::Decode<'r, Sqlite> for CellType {
        fn decode(
            value: <Sqlite as sqlx::Database>::ValueRef<'r>,
        ) -> Result<Self, sqlx::error::BoxDynError> {
            let value = <&'r str as sqlx::decode::Decode<'r, sqlx::sqlite::Sqlite>>::decode(value)?;
            match serde_json::from_str(value) {
                Ok(cell_type) => Ok(cell_type),
                _ => Err(format!("invalid value {:?} for enum {}", value, "CellType").into()),
            }
        }
    }

    impl<'q> sqlx::Encode<'q, Sqlite> for CellType {
        fn encode_by_ref(
            &self,
            buf: &mut <Sqlite as sqlx::Database>::ArgumentBuffer<'q>,
        ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
            let val = serde_json::to_string(&self).expect("Cannot serialize CellType");
            <String as sqlx::encode::Encode<'q, Sqlite>>::encode(val, buf)
        }
    }
}

pub mod state_sqlite_impls {
    use sqlx::Sqlite;

    use super::*;

    impl sqlx::Type<Sqlite> for State {
        fn type_info() -> <Sqlite as sqlx::Database>::TypeInfo {
            <str as sqlx::Type<sqlx::Sqlite>>::type_info()
        }
    }

    impl<'r> sqlx::Decode<'r, Sqlite> for State {
        fn decode(
            value: <Sqlite as sqlx::Database>::ValueRef<'r>,
        ) -> Result<Self, sqlx::error::BoxDynError> {
            let value = <&'r str as sqlx::decode::Decode<'r, sqlx::sqlite::Sqlite>>::decode(value)?;
            match serde_json::from_str(value) {
                Ok(cell_type) => Ok(cell_type),
                _ => Err(format!("invalid value {:?} for enum {}", value, "State").into()),
            }
        }
    }

    impl<'q> sqlx::Encode<'q, Sqlite> for State {
        fn encode_by_ref(
            &self,
            buf: &mut <Sqlite as sqlx::Database>::ArgumentBuffer<'q>,
        ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
            let val = serde_json::to_string(&self).expect("Cannot serialize State");
            <String as sqlx::encode::Encode<'q, Sqlite>>::encode(val, buf)
        }
    }
}
