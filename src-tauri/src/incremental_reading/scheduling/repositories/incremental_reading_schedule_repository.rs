use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::{
    Guid, common::repository_error::RepositoryError,
    incremental_reading::dto::due_incremental_reading_dto::DueIncrementalReadingDto,
    incremental_reading::scheduling::entities::incremental_reading_schedule::IncrementalReadingSchedule,
};

#[async_trait]
pub trait IncrementalReadingScheduleRepository: Send + Sync {
    async fn get_by_cell_id(
        &self,
        cell_id: Guid,
    ) -> Result<Option<IncrementalReadingSchedule>, RepositoryError>;
    async fn create(&self, schedule: &IncrementalReadingSchedule) -> Result<(), RepositoryError>;
    async fn update(&self, schedule: &IncrementalReadingSchedule) -> Result<(), RepositoryError>;
    async fn get_all_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<IncrementalReadingSchedule>, RepositoryError>;
    async fn upsert_with_modified_date_if_modified_before(
        &self,
        schedule: &IncrementalReadingSchedule,
        modified_date: DateTime<Utc>,
    ) -> Result<u64, RepositoryError>;
    /// Returns the incremental readings whose `next_reading_date` is before `before`
    /// and that are not yet completed/finished, ordered by priority (High → Low), then
    /// by whether they have extracts (with extracts first) within the same priority.
    async fn get_due_ordered_by_priority_then_extracts(
        &self,
        before: DateTime<Utc>,
    ) -> Result<Vec<DueIncrementalReadingDto>, RepositoryError>;
}
