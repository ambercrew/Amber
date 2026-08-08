use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::study::value_objects::card_state::CardState;

#[derive(Debug, Clone, PartialEq)]
pub struct CardReview {
    pub card_id: Uuid,
    pub due: DateTime<Utc>,
    pub stability: f32,
    pub difficulty: f32,
    pub reps: u32,
    pub lapses: u32,
    pub state: CardState,
    pub last_reviewed: Option<DateTime<Utc>>,
}
