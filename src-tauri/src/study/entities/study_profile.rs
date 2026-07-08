use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub struct StudyProfile {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub name: String,
    pub is_default: bool,
    // FSRS (cards)
    pub desired_retention: f32,
    pub fsrs_params: Option<Vec<f32>>,
    // Incremental reading (readings/extracts)
    pub default_a_factor: f32,
    pub initial_interval_days: f32,
    pub min_interval_days: f32,
}
