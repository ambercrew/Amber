use chrono::{DateTime, Utc};
use uuid::Uuid;

/// The trash state of a single element as it travels over sync.
///
/// `trashed_at` being `None` means the element is not in the trash — either it
/// never was, or it has been restored. `trash_modified_at` is when that state
/// last changed and is what decides which side wins when two machines disagree.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TrashState {
    pub element_id: Uuid,
    pub element_created_at: DateTime<Utc>,
    pub trashed_at: Option<DateTime<Utc>>,
    pub trashed_root: bool,
    pub trash_modified_at: DateTime<Utc>,
}
