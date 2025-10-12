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
    /// Used for unit testing, or repositories when reconsturcting a reptition.
    pub fn new_unchecked(
        id: Guid,
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

    pub fn cell_id(&self) -> Guid {
        self.cell_id
    }
}

impl Default for Repetition {
    fn default() -> Self {
        Self {
            id: Guid::new_v4(),
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
