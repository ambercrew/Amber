use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::Guid;

#[derive(Debug, Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum State {
    #[default]
    New,
    Learning,
    Relearning,
    Review,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Repetition {
    pub(in crate::cells) id: Guid,
    pub(in crate::cells) created_date: DateTime<Utc>,
    pub(in crate::cells) modified_date: DateTime<Utc>,
    pub(in crate::cells) file_id: Guid,
    pub(in crate::cells) cell_id: Guid,
    pub(in crate::cells) due: DateTime<Utc>,
    pub(in crate::cells) stability: f64,
    pub(in crate::cells) difficulty: f64,
    pub(in crate::cells) elapsed_days: i64,
    pub(in crate::cells) scheduled_days: i64,
    pub(in crate::cells) reps: i64,
    pub(in crate::cells) lapses: i64,
    pub(in crate::cells) state: State,
    pub(in crate::cells) last_review: Option<DateTime<Utc>>,
    pub(in crate::cells) additional_content: Option<String>,
}

impl Repetition {
    #[allow(clippy::too_many_arguments)]
    pub fn new_unchecked(
        id: Guid,
        created_date: DateTime<Utc>,
        modified_date: DateTime<Utc>,
        file_id: Guid,
        cell_id: Guid,
        due: DateTime<Utc>,
        stability: f64,
        difficulty: f64,
        elapsed_days: i64,
        scheduled_days: i64,
        reps: i64,
        lapses: i64,
        state: State,
        last_review: Option<DateTime<Utc>>,
        additional_content: Option<String>,
    ) -> Self {
        Self {
            id,
            created_date,
            modified_date,
            file_id,
            cell_id,
            due,
            stability,
            difficulty,
            elapsed_days,
            scheduled_days,
            reps,
            lapses,
            state,
            last_review,
            additional_content,
        }
    }

    pub fn id(&self) -> uuid::Uuid {
        self.id
    }

    pub fn created_date(&self) -> DateTime<Utc> {
        self.created_date
    }

    pub fn modified_date(&self) -> DateTime<Utc> {
        self.modified_date
    }

    pub fn file_id(&self) -> uuid::Uuid {
        self.file_id
    }

    pub fn cell_id(&self) -> uuid::Uuid {
        self.cell_id
    }

    pub fn due(&self) -> DateTime<Utc> {
        self.due
    }

    pub fn stability(&self) -> f64 {
        self.stability
    }

    pub fn difficulty(&self) -> f64 {
        self.difficulty
    }

    pub fn elapsed_days(&self) -> i64 {
        self.elapsed_days
    }

    pub fn scheduled_days(&self) -> i64 {
        self.scheduled_days
    }

    pub fn reps(&self) -> i64 {
        self.reps
    }

    pub fn lapses(&self) -> i64 {
        self.lapses
    }

    pub fn state(&self) -> &State {
        &self.state
    }

    pub fn last_review(&self) -> Option<DateTime<Utc>> {
        self.last_review
    }

    pub fn additional_content(&self) -> Option<&String> {
        self.additional_content.as_ref()
    }
}

impl Default for Repetition {
    fn default() -> Self {
        Self {
            id: Guid::new_v4(),
            created_date: Utc::now(),
            modified_date: Utc::now(),
            file_id: Default::default(),
            cell_id: Default::default(),
            due: Utc::now().to_utc(),
            stability: Default::default(),
            difficulty: Default::default(),
            elapsed_days: Default::default(),
            scheduled_days: Default::default(),
            reps: Default::default(),
            lapses: Default::default(),
            state: Default::default(),
            last_review: None,
            additional_content: Default::default(),
        }
    }
}
