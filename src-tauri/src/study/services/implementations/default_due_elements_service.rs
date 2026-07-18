use std::sync::Arc;

use async_trait::async_trait;
use chrono::Utc;
use injector_derive::ScopeInjectable;

use crate::common::repository_error::RepositoryError;
use crate::elements::value_objects::element_id::ElementId;
use crate::study::repositories::card_review_repository::CardReviewRepository;
use crate::study::repositories::reading_review_repository::ReadingReviewRepository;
use crate::study::services::due_elements_service::DueElementsService;

#[derive(ScopeInjectable)]
pub struct DefaultDueElementsService {
    card_review_repository: Arc<dyn CardReviewRepository>,
    reading_review_repository: Arc<dyn ReadingReviewRepository>,
}

#[async_trait]
impl DueElementsService for DefaultDueElementsService {
    async fn get_due_elements(&self) -> Result<Vec<ElementId>, RepositoryError> {
        let as_of = Utc::now();

        let mut due: Vec<ElementId> = self
            .card_review_repository
            .get_due_card_ids(as_of)
            .await?
            .into_iter()
            .map(ElementId::Card)
            .collect();

        due.extend(
            self.reading_review_repository
                .get_due_element_ids(as_of)
                .await?,
        );

        Ok(due)
    }
}

#[cfg(test)]
mod tests {
    use chrono::{Duration, Utc};
    use fractional_index::FractionalIndex;
    use injector::{injector::Injector, register_scope};
    use uuid::Uuid;

    use crate::{
        elements::{
            entities::{card::Card, reading::Reading},
            repositories::{
                card_repository::CardRepository, meta_repository::MetaRepository,
                reading_repository::ReadingRepository,
            },
            value_objects::meta::Meta,
        },
        infrastructure::repositories::sqlite::{
            sqlite_card_repository::SqliteCardRepository,
            sqlite_card_review_repository::SqliteCardReviewRepository,
            sqlite_meta_repository::SqliteMetaRepository,
            sqlite_reading_repository::SqliteReadingRepository,
            sqlite_reading_review_repository::SqliteReadingReviewRepository,
        },
        study::entities::reading_review::ReadingReview,
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn CardRepository, SqliteCardRepository);
        register_scope!(injector, dyn ReadingRepository, SqliteReadingRepository);
        register_scope!(injector, dyn MetaRepository, SqliteMetaRepository);
        register_scope!(
            injector,
            dyn CardReviewRepository,
            SqliteCardReviewRepository
        );
        register_scope!(
            injector,
            dyn ReadingReviewRepository,
            SqliteReadingReviewRepository
        );
        register_scope!(injector, dyn DueElementsService, DefaultDueElementsService);
        injector
    }

    fn make_meta(id: ElementId) -> Meta {
        Meta {
            element_id: id,
            name: "test".into(),
            parent: None,
            position: FractionalIndex::default(),
            study_profile_id: None,
            created_at: Utc::now(),
            modified_at: Utc::now(),
        }
    }

    #[tokio::test]
    async fn get_due_elements_new_card_and_future_reading_returns_only_card() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let card_repo = scope.resolve::<dyn CardRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let reading_review_repo = scope.resolve::<dyn ReadingReviewRepository>().await;
        let service = scope.resolve::<dyn DueElementsService>().await;

        let card_id = ElementId::Card(Uuid::new_v4());
        card_repo
            .create(Card {
                meta: make_meta(card_id),
                front: String::new(),
                back: String::new(),
            })
            .await
            .unwrap();

        let reading_id = ElementId::Reading(Uuid::new_v4());
        reading_repo
            .create(
                Reading {
                    a_factor: 1.2,
                    meta: make_meta(reading_id),
                    position_split: 0,
                    position_block: 0,
                },
                Vec::new(),
            )
            .await
            .unwrap();
        reading_review_repo
            .upsert(&ReadingReview {
                element_id: reading_id,
                due: Utc::now() + Duration::days(30),
                interval_days: 30.0,
                last_reviewed: Some(Utc::now()),
                finished_at: None,
            })
            .await
            .unwrap();

        // Act

        let due = service.get_due_elements().await.unwrap();

        // Assert

        assert!(due.contains(&card_id));
        assert!(!due.contains(&reading_id));
    }
}
