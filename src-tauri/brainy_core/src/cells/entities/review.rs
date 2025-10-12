use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::{common::extensions::to_datetime_ext::ToDateTimeExt, generated_code, Guid};

#[derive(Debug, Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Rating {
    #[default]
    Again,
    Hard,
    Good,
    Easy,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Review {
    pub(in crate::cells) id: Guid,
    /// Review can should exist even when the cell is deleted.
    pub(in crate::cells) cell_id: Option<Guid>,
    pub(in crate::cells) study_time: u32,
    pub(in crate::cells) date: DateTime<Utc>,
    pub(in crate::cells) rating: Rating,
}

impl Review {
    pub fn new(
        id: Option<Guid>,
        cell_id: Option<Guid>,
        study_time: u32,
        date: DateTime<Utc>,
        rating: Rating,
    ) -> Self {
        Self {
            id: id.unwrap_or(Guid::new_v4()),
            cell_id,
            study_time,
            date,
            rating,
        }
    }
}

impl From<generated_code::Review> for Review {
    fn from(value: generated_code::Review) -> Self {
        Self {
            id: Guid::parse_str(&value.id).unwrap(),
            cell_id: value.cell_id.map(|r| Guid::parse_str(&r).unwrap()),
            study_time: value.study_time,
            date: value.date.unwrap().to_datetime_utc(),
            rating: serde_json::from_str(&value.rating).unwrap(),
        }
    }
}

impl Default for Review {
    fn default() -> Self {
        Self {
            id: Guid::new_v4(),
            cell_id: Default::default(),
            study_time: Default::default(),
            date: Default::default(),
            rating: Default::default(),
        }
    }
}
