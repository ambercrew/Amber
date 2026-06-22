use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::Guid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ExtractStatus {
    Pending,
    Added,
    Dismissed,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Extract {
    pub(in crate::incremental_reading::extracts) id: Guid,
    pub(in crate::incremental_reading::extracts) created_date: DateTime<Utc>,
    pub(in crate::incremental_reading::extracts) modified_date: DateTime<Utc>,
    pub(in crate::incremental_reading::extracts) cell_id: Guid,
    pub(in crate::incremental_reading::extracts) status: ExtractStatus,
}

impl Extract {
    pub fn new(id: Guid, cell_id: Guid) -> Self {
        Self {
            id,
            created_date: Utc::now(),
            modified_date: Utc::now(),
            cell_id,
            status: ExtractStatus::Pending,
        }
    }

    pub fn new_unchecked(
        id: Guid,
        created_date: DateTime<Utc>,
        modified_date: DateTime<Utc>,
        cell_id: Guid,
        status: ExtractStatus,
    ) -> Self {
        Self {
            id,
            created_date,
            modified_date,
            cell_id,
            status,
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

    pub fn cell_id(&self) -> Guid {
        self.cell_id
    }

    pub fn status(&self) -> &ExtractStatus {
        &self.status
    }

    pub fn set_status(&mut self, status: ExtractStatus) {
        self.status = status;
    }
}
