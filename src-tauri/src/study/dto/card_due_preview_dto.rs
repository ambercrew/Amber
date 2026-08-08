use chrono::{DateTime, Utc};
use serde::Serialize;

use crate::study::services::card_grading_service::CardDuePreview;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardDuePreviewDto {
    pub again: DateTime<Utc>,
    pub hard: DateTime<Utc>,
    pub good: DateTime<Utc>,
    pub easy: DateTime<Utc>,
}

impl From<CardDuePreview> for CardDuePreviewDto {
    fn from(preview: CardDuePreview) -> Self {
        CardDuePreviewDto {
            again: preview.again,
            hard: preview.hard,
            good: preview.good,
            easy: preview.easy,
        }
    }
}
