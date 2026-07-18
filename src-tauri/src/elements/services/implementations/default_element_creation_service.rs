use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Duration, Utc};
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::elements::dto::create_card_dto::CreateCardDto;
use crate::elements::dto::create_extract_dto::CreateExtractDto;
use crate::elements::dto::create_reading_dto::CreateReadingDto;
use crate::elements::entities::card::Card;
use crate::elements::entities::extract::Extract;
use crate::elements::entities::reading::{Reading, ReadingSplit};
use crate::elements::repositories::card_repository::CardRepository;
use crate::elements::repositories::extract_repository::ExtractRepository;
use crate::elements::repositories::reading_repository::ReadingRepository;
use crate::elements::services::element_creation_service::{
    ElementCreationError, ElementCreationService,
};
use crate::elements::services::element_index_service::ElementIndexService;
use crate::elements::value_objects::element_id::ElementId;
use crate::elements::value_objects::meta::Meta;
use crate::study::entities::card_review::CardReview;
use crate::study::entities::reading_review::ReadingReview;
use crate::study::entities::study_profile::StudyProfile;
use crate::study::repositories::card_review_repository::CardReviewRepository;
use crate::study::repositories::reading_review_repository::ReadingReviewRepository;
use crate::study::services::profile_resolution_service::ProfileResolutionService;
use crate::study::utils::day_boundary::start_of_today_utc;
use crate::study::value_objects::card_state::CardState;

#[derive(ScopeInjectable)]
pub struct DefaultElementCreationService {
    reading_repository: Arc<dyn ReadingRepository>,
    extract_repository: Arc<dyn ExtractRepository>,
    card_repository: Arc<dyn CardRepository>,
    index_service: Arc<dyn ElementIndexService>,
    reading_review_repository: Arc<dyn ReadingReviewRepository>,
    card_review_repository: Arc<dyn CardReviewRepository>,
    profile_resolution_service: Arc<dyn ProfileResolutionService>,
}

#[async_trait]
impl ElementCreationService for DefaultElementCreationService {
    async fn create_reading(&self, dto: CreateReadingDto) -> Result<(), ElementCreationError> {
        let element_id = ElementId::Reading(dto.id);
        let parent = dto.meta.parent;
        let position = self.index_service.get_new_last_index(parent).await?;
        let now = Utc::now();
        let profile = self
            .profile_resolution_service
            .resolve_profile(parent)
            .await?;

        let reading = Reading {
            meta: Meta {
                element_id,
                name: dto.meta.name,
                parent,
                position,
                study_profile_id: None,
                created_at: now,
                modified_at: now,
            },
            position_split: 0,
            position_block: 0,
            a_factor: profile.initial_a_factor,
        };
        let splits = dto
            .splits
            .into_iter()
            .enumerate()
            .map(|(seq, content)| ReadingSplit {
                seq: seq as u32,
                content,
            })
            .collect();
        self.reading_repository.create(reading, splits).await?;
        self.ensure_reading_review(element_id, profile).await
    }

    async fn create_extract(&self, dto: CreateExtractDto) -> Result<(), ElementCreationError> {
        let element_id = ElementId::Extract(dto.id);
        let parent = dto.meta.parent;
        let position = self.index_service.get_new_last_index(parent).await?;
        let now = Utc::now();
        let profile = self
            .profile_resolution_service
            .resolve_profile(parent)
            .await?;

        let extract = Extract {
            meta: Meta {
                element_id,
                name: dto.meta.name,
                parent,
                position,
                study_profile_id: None,
                created_at: now,
                modified_at: now,
            },
            content: dto.content,
            a_factor: profile.initial_a_factor,
        };
        self.extract_repository.create(extract).await?;
        // Extracts are reviewed like readings.
        self.ensure_reading_review(element_id, profile).await
    }

    async fn create_card(&self, dto: CreateCardDto) -> Result<(), ElementCreationError> {
        let element_id = ElementId::Card(dto.id);
        let parent = dto.meta.parent;
        let position = self.index_service.get_new_last_index(parent).await?;
        let now = Utc::now();

        let card = Card {
            meta: Meta {
                element_id,
                name: dto.meta.name,
                parent,
                position,
                study_profile_id: None,
                created_at: now,
                modified_at: now,
            },
            front: dto.front,
            back: dto.back,
        };
        self.card_repository.create(card).await?;
        self.ensure_card_review(dto.id, element_id).await
    }
}

impl DefaultElementCreationService {
    async fn ensure_reading_review(
        &self,
        element_id: ElementId,
        profile: StudyProfile,
    ) -> Result<(), ElementCreationError> {
        let exists = self
            .reading_review_repository
            .get_by_element_id(element_id.id())
            .await?
            .is_some();
        if exists {
            return Ok(());
        }

        let review = ReadingReview {
            element_id,
            due: due_from_today(profile.initial_interval_days),
            interval_days: 0.0,
            last_reviewed: None,
            finished_at: None,
        };
        self.reading_review_repository.upsert(&review).await?;
        Ok(())
    }

    async fn ensure_card_review(
        &self,
        card_id: Uuid,
        element_id: ElementId,
    ) -> Result<(), ElementCreationError> {
        let exists = self
            .card_review_repository
            .get_by_card_id(card_id)
            .await?
            .is_some();
        if exists {
            return Ok(());
        }

        let profile = self
            .profile_resolution_service
            .resolve_profile(Some(element_id))
            .await?;
        let review = CardReview {
            card_id,
            due: due_from_today(profile.initial_interval_days),
            stability: 0.0,
            difficulty: 0.0,
            reps: 0,
            lapses: 0,
            state: CardState::New,
            last_reviewed: None,
        };
        self.card_review_repository.upsert(&review).await?;
        Ok(())
    }
}

fn due_from_today(initial_interval_days: f32) -> DateTime<Utc> {
    start_of_today_utc()
        + Duration::seconds((initial_interval_days as f64 * 86400.0).round() as i64)
}

#[cfg(test)]
mod tests {
    use injector::{injector::Injector, register_scope};

    use crate::{
        elements::repositories::meta_repository::MetaRepository,
        elements::services::implementations::default_element_index_service::DefaultElementIndexService,
        infrastructure::repositories::sqlite::{
            sqlite_card_repository::SqliteCardRepository,
            sqlite_card_review_repository::SqliteCardReviewRepository,
            sqlite_extract_repository::SqliteExtractRepository,
            sqlite_meta_repository::SqliteMetaRepository,
            sqlite_reading_repository::SqliteReadingRepository,
            sqlite_reading_review_repository::SqliteReadingReviewRepository,
            sqlite_study_profile_repository::SqliteStudyProfileRepository,
        },
        study::entities::study_profile::StudyProfile,
        study::repositories::study_profile_repository::StudyProfileRepository,
        study::services::implementations::default_profile_resolution_service::DefaultProfileResolutionService,
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn ReadingRepository, SqliteReadingRepository);
        register_scope!(injector, dyn ExtractRepository, SqliteExtractRepository);
        register_scope!(injector, dyn CardRepository, SqliteCardRepository);
        register_scope!(injector, dyn MetaRepository, SqliteMetaRepository);
        register_scope!(
            injector,
            dyn ElementIndexService,
            DefaultElementIndexService
        );
        register_scope!(
            injector,
            dyn ReadingReviewRepository,
            SqliteReadingReviewRepository
        );
        register_scope!(
            injector,
            dyn CardReviewRepository,
            SqliteCardReviewRepository
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
        injector
    }

    fn dto_meta(parent: Option<ElementId>) -> crate::elements::dto::create_meta_dto::CreateMetaDto {
        crate::elements::dto::create_meta_dto::CreateMetaDto {
            name: "test".into(),
            parent,
        }
    }

    async fn create_test_profile(
        scope: &injector::injector_scope::InjectorScope<'_>,
        initial_interval_days: f32,
    ) -> Uuid {
        let profile_repo = scope.resolve::<dyn StudyProfileRepository>().await;
        let profile = StudyProfile {
            id: Uuid::new_v4(),
            created_at: Utc::now(),
            modified_at: Utc::now(),
            name: "test".into(),
            is_default: true,
            desired_retention: 0.9,
            fsrs_params: None,
            initial_a_factor: 1.2,
            initial_interval_days,
            min_interval_days: 1.0,
        };
        profile_repo.create(&profile).await.unwrap();
        profile.id
    }

    #[tokio::test]
    async fn create_reading_creates_review_due_today_plus_initial_interval() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        create_test_profile(&scope, 3.0).await;
        let service = DefaultElementCreationService {
            reading_repository: scope.resolve::<dyn ReadingRepository>().await,
            extract_repository: scope.resolve::<dyn ExtractRepository>().await,
            card_repository: scope.resolve::<dyn CardRepository>().await,
            index_service: scope.resolve::<dyn ElementIndexService>().await,
            reading_review_repository: scope.resolve::<dyn ReadingReviewRepository>().await,
            card_review_repository: scope.resolve::<dyn CardReviewRepository>().await,
            profile_resolution_service: scope.resolve::<dyn ProfileResolutionService>().await,
        };
        let dto = CreateReadingDto {
            id: Uuid::new_v4(),
            meta: dto_meta(None),
            splits: Vec::new(),
        };
        let element_id = ElementId::Reading(dto.id);

        // Act

        service.create_reading(dto).await.unwrap();

        // Assert

        let review = scope
            .resolve::<dyn ReadingReviewRepository>()
            .await
            .get_by_element_id(element_id.id())
            .await
            .unwrap()
            .unwrap();
        assert_eq!(due_from_today(3.0), review.due);
    }

    #[tokio::test]
    async fn create_card_creates_review_due_today_plus_initial_interval() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        create_test_profile(&scope, 2.0).await;
        let service = DefaultElementCreationService {
            reading_repository: scope.resolve::<dyn ReadingRepository>().await,
            extract_repository: scope.resolve::<dyn ExtractRepository>().await,
            card_repository: scope.resolve::<dyn CardRepository>().await,
            index_service: scope.resolve::<dyn ElementIndexService>().await,
            reading_review_repository: scope.resolve::<dyn ReadingReviewRepository>().await,
            card_review_repository: scope.resolve::<dyn CardReviewRepository>().await,
            profile_resolution_service: scope.resolve::<dyn ProfileResolutionService>().await,
        };
        let dto = CreateCardDto {
            id: Uuid::new_v4(),
            meta: dto_meta(None),
            front: String::new(),
            back: String::new(),
        };
        let card_id = dto.id;

        // Act

        service.create_card(dto).await.unwrap();

        // Assert

        let review = scope
            .resolve::<dyn CardReviewRepository>()
            .await
            .get_by_card_id(card_id)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(due_from_today(2.0), review.due);
        assert_eq!(CardState::New, review.state);
    }

    #[tokio::test]
    async fn create_extract_creates_reading_review() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        create_test_profile(&scope, 1.0).await;
        let service = DefaultElementCreationService {
            reading_repository: scope.resolve::<dyn ReadingRepository>().await,
            extract_repository: scope.resolve::<dyn ExtractRepository>().await,
            card_repository: scope.resolve::<dyn CardRepository>().await,
            index_service: scope.resolve::<dyn ElementIndexService>().await,
            reading_review_repository: scope.resolve::<dyn ReadingReviewRepository>().await,
            card_review_repository: scope.resolve::<dyn CardReviewRepository>().await,
            profile_resolution_service: scope.resolve::<dyn ProfileResolutionService>().await,
        };
        let dto = CreateExtractDto {
            id: Uuid::new_v4(),
            meta: dto_meta(None),
            content: String::new(),
        };
        let element_id = ElementId::Extract(dto.id);

        // Act

        service.create_extract(dto).await.unwrap();

        // Assert

        let review = scope
            .resolve::<dyn ReadingReviewRepository>()
            .await
            .get_by_element_id(element_id.id())
            .await
            .unwrap();
        assert!(review.is_some());
    }

    async fn create_test_profile_with_a_factor(
        scope: &injector::injector_scope::InjectorScope<'_>,
        initial_a_factor: f32,
    ) -> Uuid {
        let profile_repo = scope.resolve::<dyn StudyProfileRepository>().await;
        let profile = StudyProfile {
            id: Uuid::new_v4(),
            created_at: Utc::now(),
            modified_at: Utc::now(),
            name: "test".into(),
            is_default: true,
            desired_retention: 0.9,
            fsrs_params: None,
            initial_a_factor,
            initial_interval_days: 1.0,
            min_interval_days: 1.0,
        };
        profile_repo.create(&profile).await.unwrap();
        profile.id
    }

    #[tokio::test]
    async fn create_reading_valid_dto_seeds_a_factor_from_profile() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        create_test_profile_with_a_factor(&scope, 1.5).await;
        let service = DefaultElementCreationService {
            reading_repository: scope.resolve::<dyn ReadingRepository>().await,
            extract_repository: scope.resolve::<dyn ExtractRepository>().await,
            card_repository: scope.resolve::<dyn CardRepository>().await,
            index_service: scope.resolve::<dyn ElementIndexService>().await,
            reading_review_repository: scope.resolve::<dyn ReadingReviewRepository>().await,
            card_review_repository: scope.resolve::<dyn CardReviewRepository>().await,
            profile_resolution_service: scope.resolve::<dyn ProfileResolutionService>().await,
        };
        let dto = CreateReadingDto {
            id: Uuid::new_v4(),
            meta: dto_meta(None),
            splits: Vec::new(),
        };
        let reading_id = dto.id;

        // Act

        service.create_reading(dto).await.unwrap();

        // Assert

        let reading = scope
            .resolve::<dyn ReadingRepository>()
            .await
            .get_by_id(reading_id)
            .await
            .unwrap();
        assert_eq!(1.5, reading.a_factor);
    }

    #[tokio::test]
    async fn create_extract_valid_dto_seeds_a_factor_from_profile() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        create_test_profile_with_a_factor(&scope, 1.5).await;
        let service = DefaultElementCreationService {
            reading_repository: scope.resolve::<dyn ReadingRepository>().await,
            extract_repository: scope.resolve::<dyn ExtractRepository>().await,
            card_repository: scope.resolve::<dyn CardRepository>().await,
            index_service: scope.resolve::<dyn ElementIndexService>().await,
            reading_review_repository: scope.resolve::<dyn ReadingReviewRepository>().await,
            card_review_repository: scope.resolve::<dyn CardReviewRepository>().await,
            profile_resolution_service: scope.resolve::<dyn ProfileResolutionService>().await,
        };
        let dto = CreateExtractDto {
            id: Uuid::new_v4(),
            meta: dto_meta(None),
            content: String::new(),
        };
        let extract_id = dto.id;

        // Act

        service.create_extract(dto).await.unwrap();

        // Assert

        let extract = scope
            .resolve::<dyn ExtractRepository>()
            .await
            .get_by_id(extract_id)
            .await
            .unwrap();
        assert_eq!(1.5, extract.a_factor);
    }
}
