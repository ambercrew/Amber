use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::{
    Guid,
    common::extensions::to_datetime_ext::{OptionToDateTimeExt, ToDateTimeExt},
    generated_code,
};

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

impl From<generated_code::Repetition> for Repetition {
    fn from(value: generated_code::Repetition) -> Self {
        Self {
            id: Guid::parse_str(&value.id).unwrap(),
            file_id: Guid::parse_str(&value.file_id).unwrap(),
            cell_id: Guid::parse_str(&value.cell_id).unwrap(),
            due: value.due.unwrap().to_datetime_utc(),
            stability: value.stability,
            difficulty: value.difficulty,
            elapsed_days: value.elapsed_days,
            scheduled_days: value.scheduled_days,
            reps: value.reps,
            lapses: value.lapses,
            state: serde_json::from_str(&value.state).unwrap(),
            last_review: value.last_review.to_datetime_utc(),
            additional_content: value.additional_content,
        }
    }
}
