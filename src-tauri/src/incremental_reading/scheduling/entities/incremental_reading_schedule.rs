use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::{Guid, cells::value_objects::incremental_reading::IncrementalReadingPriority};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncrementalReadingSchedule {
    pub(in crate::incremental_reading::scheduling) id: Guid,
    pub(in crate::incremental_reading::scheduling) created_date: DateTime<Utc>,
    pub(in crate::incremental_reading::scheduling) modified_date: DateTime<Utc>,
    pub(in crate::incremental_reading::scheduling) cell_id: Guid,
    pub(in crate::incremental_reading::scheduling) priority: IncrementalReadingPriority,
    pub(in crate::incremental_reading::scheduling) title: String,
    pub(in crate::incremental_reading::scheduling) next_reading_date: DateTime<Utc>,
    pub(in crate::incremental_reading::scheduling) completed: bool,
    /// Whether the cell currently has any highlights (extracts).
    pub(in crate::incremental_reading::scheduling) has_extracts: bool,
}

impl IncrementalReadingSchedule {
    pub fn new(
        id: Guid,
        cell_id: Guid,
        priority: IncrementalReadingPriority,
        title: String,
        has_extracts: bool,
        completed: bool,
    ) -> Self {
        Self {
            id,
            created_date: Utc::now(),
            modified_date: Utc::now(),
            cell_id,
            priority,
            title,
            next_reading_date: Utc::now(),
            completed,
            has_extracts,
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn new_unchecked(
        id: Guid,
        created_date: DateTime<Utc>,
        modified_date: DateTime<Utc>,
        cell_id: Guid,
        priority: IncrementalReadingPriority,
        title: String,
        next_reading_date: DateTime<Utc>,
        completed: bool,
        has_extracts: bool,
    ) -> Self {
        Self {
            id,
            created_date,
            modified_date,
            cell_id,
            priority,
            title,
            next_reading_date,
            completed,
            has_extracts,
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

    pub fn priority(&self) -> &IncrementalReadingPriority {
        &self.priority
    }

    pub fn title(&self) -> &str {
        &self.title
    }

    pub fn completed(&self) -> bool {
        self.completed
    }

    pub fn next_reading_date(&self) -> DateTime<Utc> {
        self.next_reading_date
    }

    pub fn has_extracts(&self) -> bool {
        self.has_extracts
    }

    pub fn set_priority(&mut self, priority: IncrementalReadingPriority) {
        self.priority = priority;
    }

    pub fn set_title(&mut self, title: String) {
        self.title = title;
    }

    pub fn set_next_reading_date(&mut self, next_reading_date: DateTime<Utc>) {
        self.next_reading_date = next_reading_date;
    }

    pub fn set_completed(&mut self, completed: bool) {
        self.completed = completed;
    }

    pub fn set_has_extracts(&mut self, has_extracts: bool) {
        self.has_extracts = has_extracts;
    }
}
