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
