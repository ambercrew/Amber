use std::sync::Arc;

use async_trait::async_trait;
use chrono::{Duration, Utc};
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::elements::value_objects::element_id::ElementId;
use crate::study::entities::reading_review::ReadingReview;
use crate::study::entities::reading_review_log::ReadingReviewLog;
use crate::study::repositories::reading_review_log_repository::ReadingReviewLogRepository;
use crate::study::repositories::reading_review_repository::ReadingReviewRepository;
use crate::study::services::profile_resolution_service::ProfileResolutionService;
use crate::study::services::reading_scheduling_service::{
    ReadingSchedulingError, ReadingSchedulingService,
};
use crate::study::utils::day_boundary::start_of_today_utc;
use crate::study::value_objects::reading_action::ReadingAction;

#[derive(ScopeInjectable)]
pub struct DefaultReadingSchedulingService {
    reading_review_repository: Arc<dyn ReadingReviewRepository>,
    reading_review_log_repository: Arc<dyn ReadingReviewLogRepository>,
    profile_resolution_service: Arc<dyn ProfileResolutionService>,
}

#[async_trait]
impl ReadingSchedulingService for DefaultReadingSchedulingService {
    async fn next(&self, element_id: ElementId) -> Result<ReadingReview, ReadingSchedulingError> {
        let profile = self
            .profile_resolution_service
            .resolve_profile(element_id)
            .await?;
        let existing = self
            .reading_review_repository
            .get_by_element_id(element_id.id())
            .await?;

        let interval = match &existing {
            Some(review) if review.interval_days > 0.0 => {
                review.interval_days * profile.default_a_factor
            }
            _ => profile.initial_interval_days,
        }
        .max(profile.min_interval_days);

        let now = Utc::now();
        let review = ReadingReview {
            element_id,
            due: start_of_today_utc()
                + Duration::seconds((interval as f64 * 86400.0).round() as i64),
            interval_days: interval,
            last_reviewed: Some(now),
            finished_at: existing.and_then(|review| review.finished_at),
        };

        self.reading_review_repository.upsert(&review).await?;
        self.append_log(element_id, now, ReadingAction::Next)
            .await?;

        Ok(review)
    }

    async fn finish(&self, element_id: ElementId) -> Result<ReadingReview, ReadingSchedulingError> {
        let now = Utc::now();
        let existing = self
            .reading_review_repository
            .get_by_element_id(element_id.id())
            .await?;

        let review = match existing {
            Some(review) => ReadingReview {
                finished_at: Some(now),
                ..review
            },
            None => ReadingReview {
                element_id,
                due: now,
                interval_days: 0.0,
                last_reviewed: None,
                finished_at: Some(now),
            },
        };

        self.reading_review_repository.upsert(&review).await?;
        self.append_log(element_id, now, ReadingAction::Finish)
            .await?;

        Ok(review)
    }

    async fn unfinish(
        &self,
        element_id: ElementId,
    ) -> Result<ReadingReview, ReadingSchedulingError> {
        let existing = self
            .reading_review_repository
            .get_by_element_id(element_id.id())
            .await?
            .ok_or(ReadingSchedulingError::NeverReviewed)?;

        let review = ReadingReview {
            finished_at: None,
            due: start_of_today_utc(),
            ..existing
        };

        self.reading_review_repository.upsert(&review).await?;

        Ok(review)
    }
}

impl DefaultReadingSchedulingService {
    async fn append_log(
        &self,
        element_id: ElementId,
        reviewed_at: chrono::DateTime<Utc>,
        action: ReadingAction,
    ) -> Result<(), ReadingSchedulingError> {
        self.reading_review_log_repository
            .create(&ReadingReviewLog {
                id: Uuid::new_v4(),
                element_id: Some(element_id.id()),
                reviewed_at,
                action,
            })
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use fractional_index::FractionalIndex;
    use injector::{injector::Injector, register_scope};

    use crate::{
        elements::{
            entities::reading::Reading,
            repositories::{
                meta_repository::MetaRepository, reading_repository::ReadingRepository,
            },
            value_objects::meta::Meta,
        },
        infrastructure::repositories::sqlite::{
            sqlite_meta_repository::SqliteMetaRepository,
            sqlite_reading_repository::SqliteReadingRepository,
            sqlite_reading_review_log_repository::SqliteReadingReviewLogRepository,
            sqlite_reading_review_repository::SqliteReadingReviewRepository,
            sqlite_study_profile_repository::SqliteStudyProfileRepository,
        },
        study::repositories::study_profile_repository::StudyProfileRepository,
        study::services::implementations::default_profile_resolution_service::DefaultProfileResolutionService,
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn ReadingRepository, SqliteReadingRepository);
        register_scope!(injector, dyn MetaRepository, SqliteMetaRepository);
        register_scope!(
            injector,
            dyn ReadingReviewRepository,
            SqliteReadingReviewRepository
        );
        register_scope!(
            injector,
            dyn ReadingReviewLogRepository,
            SqliteReadingReviewLogRepository
        );
        register_scope!(
            injector,
            dyn StudyProfileRepository,
            SqliteStudyProfileRepository
        );
        register_scope!(
            injector,
            dyn ProfileResolutionService,
            DefaultProfileResolutionService
        );
        register_scope!(
            injector,
            dyn ReadingSchedulingService,
            DefaultReadingSchedulingService
        );
        injector
    }

    async fn create_test_reading(scope: &injector::injector_scope::InjectorScope<'_>) -> ElementId {
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let element_id = ElementId::Reading(Uuid::new_v4());
        reading_repo
            .create(Reading {
                meta: Meta {
                    element_id,
                    name: "test".into(),
                    parent: None,
                    position: FractionalIndex::default(),
                    study_profile_id: None,
                    created_at: Utc::now(),
                    modified_at: Utc::now(),
                },
                content: String::new(),
                position_block_index: 0,
            })
            .await
            .unwrap();
        element_id
    }

    #[tokio::test]
    async fn next_first_pass_uses_profile_initial_interval() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let element_id = create_test_reading(&scope).await;
        let service = scope.resolve::<dyn ReadingSchedulingService>().await;

        // Act

        let review = service.next(element_id).await.unwrap();

        // Assert

        assert_eq!(1.0, review.interval_days);
    }

    #[tokio::test]
    async fn next_second_pass_multiplies_interval_by_a_factor() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let element_id = create_test_reading(&scope).await;
        let service = scope.resolve::<dyn ReadingSchedulingService>().await;
        service.next(element_id).await.unwrap();

        // Act

        let review = service.next(element_id).await.unwrap();

        // Assert

        assert_eq!(1.2, review.interval_days);
    }

    #[tokio::test]
    async fn finish_preserves_due_and_interval() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let element_id = create_test_reading(&scope).await;
        let service = scope.resolve::<dyn ReadingSchedulingService>().await;
        let before = service.next(element_id).await.unwrap();

        // Act

        let after = service.finish(element_id).await.unwrap();

        // Assert

        assert!(after.finished_at.is_some());
        assert_eq!(before.due, after.due);
        assert_eq!(before.interval_days, after.interval_days);
    }

    #[tokio::test]
    async fn unfinish_finished_element_clears_finished_at_and_resets_due_to_today() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let element_id = create_test_reading(&scope).await;
        let service = scope.resolve::<dyn ReadingSchedulingService>().await;
        service.next(element_id).await.unwrap();
        service.finish(element_id).await.unwrap();

        // Act

        let after = service.unfinish(element_id).await.unwrap();

        // Assert

        assert!(after.finished_at.is_none());
        assert_eq!(start_of_today_utc(), after.due);
    }

    #[tokio::test]
    async fn unfinish_never_reviewed_element_returns_never_reviewed_error() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let element_id = create_test_reading(&scope).await;
        let service = scope.resolve::<dyn ReadingSchedulingService>().await;

        // Act

        let result = service.unfinish(element_id).await;

        // Assert

        assert!(matches!(result, Err(ReadingSchedulingError::NeverReviewed)));
    }
}
