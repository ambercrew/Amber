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
    pub learning_steps: i64,
    pub scheduled_days: i64,
    pub reps: i64,
    pub lapses: i64,
    pub state: State,
    pub last_review: Option<DateTime<Utc>>,
    pub additional_content: Option<String>,
}

impl From<RepetitionRow> for Repetition {
    fn from(value: RepetitionRow) -> Self {
        Repetition::new_unchecked(
            value.id,
            value.created_date,
            value.modified_date,
            value.file_id,
            value.cell_id,
            value.due,
            value.stability,
            value.difficulty,
            value.learning_steps,
            value.scheduled_days,
            value.reps,
            value.lapses,
            value.state,
            value.last_review,
            value.additional_content,
        )
    }
}
