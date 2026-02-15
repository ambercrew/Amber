use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::Guid;

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
    pub(in crate::cells) created_date: DateTime<Utc>,
    pub(in crate::cells) modified_date: DateTime<Utc>,
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
            created_date: Utc::now(),
            modified_date: Utc::now(),
            cell_id,
            study_time,
            date,
            rating,
        }
    }

    pub fn new_unchecked(
        id: Guid,
        created_date: DateTime<Utc>,
        modified_date: DateTime<Utc>,
        cell_id: Option<Guid>,
        study_time: u32,
        date: DateTime<Utc>,
        rating: Rating,
    ) -> Self {
        Self {
            id,
            created_date,
            modified_date,
            cell_id,
            study_time,
            date,
            rating,
        }
    }

    pub fn id(&self) -> Guid {
        self.id
    }

    pub fn created_date(&self) -> DateTime<Utc> {
        self.created_date
    }

    pub fn modified_date(&self) -> DateTime<Utc> {
        self.modified_date
    }

    pub fn cell_id(&self) -> Option<Guid> {
        self.cell_id
    }

    pub fn study_time(&self) -> u32 {
        self.study_time
    }

    pub fn date(&self) -> DateTime<Utc> {
        self.date
    }

    pub fn rating(&self) -> &Rating {
        &self.rating
    }
}

impl Default for Review {
    fn default() -> Self {
        Self {
            id: Guid::new_v4(),
            created_date: Utc::now(),
            modified_date: Utc::now(),
            cell_id: Default::default(),
            study_time: Default::default(),
            date: Default::default(),
            rating: Default::default(),
        }
    }
}
