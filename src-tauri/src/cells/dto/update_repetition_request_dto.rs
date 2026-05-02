use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::{
    Guid,
    cells::entities::repetition::{Repetition, State},
};

#[derive(Default, Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRepetitionRequestDto {
    pub id: Guid,
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

impl UpdateRepetitionRequestDto {
    pub fn apply_update(self, repetition: &mut Repetition) {
        repetition.id = self.id;
        repetition.file_id = self.file_id;
        repetition.cell_id = self.cell_id;
        repetition.due = self.due;
        repetition.stability = self.stability;
        repetition.difficulty = self.difficulty;
        repetition.elapsed_days = self.elapsed_days;
        repetition.scheduled_days = self.scheduled_days;
        repetition.reps = self.reps;
        repetition.lapses = self.lapses;
        repetition.state = self.state;
        repetition.last_review = self.last_review;
        repetition.additional_content = self.additional_content;
    }
}
