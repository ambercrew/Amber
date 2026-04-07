use chrono::{DateTime, Utc};

use crate::{
    Guid,
    cells::entities::repetition::{Repetition, State},
};

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
