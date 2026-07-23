use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::elements::repositories::meta_repository::MetaRepository;
use crate::elements::services::element_details_service::{
    ElementDetails, ElementDetailsError, ElementDetailsService,
};
use crate::elements::value_objects::element_id::ElementId;
use crate::sources::services::source_service::SourceService;
use crate::study::repositories::card_review_repository::CardReviewRepository;
use crate::study::repositories::reading_review_repository::ReadingReviewRepository;
use crate::study::services::profile_resolution_service::{ProfileResolutionService, ProfileSource};
use crate::study::services::study_profile_service::StudyProfileService;

#[derive(ScopeInjectable)]
pub struct DefaultElementDetailsService {
    meta_repository: Arc<dyn MetaRepository>,
    source_service: Arc<dyn SourceService>,
    card_review_repository: Arc<dyn CardReviewRepository>,
    reading_review_repository: Arc<dyn ReadingReviewRepository>,
    profile_resolution_service: Arc<dyn ProfileResolutionService>,
    study_profile_service: Arc<dyn StudyProfileService>,
}

#[async_trait]
impl ElementDetailsService for DefaultElementDetailsService {
    async fn get_element_details(
        &self,
        element_id: ElementId,
    ) -> Result<ElementDetails, ElementDetailsError> {
        let meta = self.meta_repository.get_by_id(element_id.id()).await?;

        let source = match meta.source_id {
            Some(source_id) => Some(self.source_service.get_source(source_id).await?),
            None => None,
        };

        let derived_from_name = match meta.derived_from {
            Some(derived_from) => Some(
                self.meta_repository
                    .get_by_id(derived_from.id())
                    .await?
                    .name,
            ),
            None => None,
        };

        let card_review = if matches!(element_id, ElementId::Card(_)) {
            self.card_review_repository
                .get_by_card_id(element_id.id())
                .await?
        } else {
            None
        };

        let reading_review = if matches!(element_id, ElementId::Reading(_) | ElementId::Extract(_))
        {
            self.reading_review_repository
                .get_by_element_id(element_id.id())
                .await?
        } else {
            None
        };

        let effective_profile = self
            .profile_resolution_service
            .resolve_effective_profile(element_id)
            .await?;
        let profiles = self.study_profile_service.list_profiles().await?;

        let inherited_profile_name = match effective_profile.source {
            ProfileSource::Direct => match meta.parent {
                Some(parent) => {
                    let parent_effective = self
                        .profile_resolution_service
                        .resolve_effective_profile(parent)
                        .await?;
                    Some(parent_effective.profile.name)
                }
                None => profiles
                    .iter()
                    .find(|profile| profile.is_default)
                    .map(|profile| profile.name.clone()),
            },
            _ => Some(effective_profile.profile.name.clone()),
        };

        Ok(ElementDetails {
            source,
            derived_from_name,
            card_review,
            reading_review,
            effective_profile,
            profiles,
            inherited_profile_name,
        })
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
            entities::card::Card, repositories::card_repository::CardRepository,
            value_objects::meta::Meta,
        },
        infrastructure::repositories::sqlite::{
            sqlite_card_repository::SqliteCardRepository,
            sqlite_card_review_repository::SqliteCardReviewRepository,
            sqlite_meta_repository::SqliteMetaRepository,
            sqlite_reading_review_repository::SqliteReadingReviewRepository,
            sqlite_source_repository::SqliteSourceRepository,
            sqlite_study_profile_repository::SqliteStudyProfileRepository,
        },
        sources::{
            repositories::source_repository::SourceRepository,
            services::implementations::default_source_service::DefaultSourceService,
            services::source_service::SourceFields, value_objects::source_type::SourceType,
        },
        study::{
            entities::{
                card_review::CardReview, reading_review::ReadingReview, study_profile::StudyProfile,
            },
            repositories::study_profile_repository::StudyProfileRepository,
            services::implementations::default_profile_resolution_service::DefaultProfileResolutionService,
            services::implementations::default_study_profile_service::DefaultStudyProfileService,
            value_objects::card_state::CardState,
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn MetaRepository, SqliteMetaRepository);
        register_scope!(injector, dyn CardRepository, SqliteCardRepository);
        register_scope!(injector, dyn SourceRepository, SqliteSourceRepository);
        register_scope!(injector, dyn SourceService, DefaultSourceService);
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
            dyn StudyProfileService,
            DefaultStudyProfileService
        );
        register_scope!(
            injector,
            dyn ElementDetailsService,
            DefaultElementDetailsService
        );
        injector
    }

    fn make_meta(id: ElementId, parent: Option<ElementId>) -> Meta {
        Meta {
            element_id: id,
            name: "test".into(),
            parent,
            position: FractionalIndex::default(),
            study_profile_id: None,
            source_id: None,
            derived_from: None,
            created_at: Utc::now(),
            modified_at: Utc::now(),
        }
    }

    fn make_profile(is_default: bool) -> StudyProfile {
        let now = Utc::now();
        StudyProfile {
            id: Uuid::new_v4(),
            created_at: now,
            modified_at: now,
            name: if is_default { "Default" } else { "Custom" }.to_string(),
            is_default,
            desired_retention: 0.9,
            fsrs_params: None,
            initial_a_factor: 1.2,
            initial_interval_days: 1.0,
            min_interval_days: 1.0,
        }
    }

    #[tokio::test]
    async fn get_element_details_element_with_no_source_or_parent_returns_empty_details() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;
        let profile_repo = scope.resolve::<dyn StudyProfileRepository>().await;
        let service = scope.resolve::<dyn ElementDetailsService>().await;

        let default_profile = make_profile(true);
        profile_repo.create(&default_profile).await.unwrap();

        let folder_id = ElementId::Folder(Uuid::new_v4());
        meta_repo
            .create_meta(&make_meta(folder_id, None))
            .await
            .unwrap();

        // Act

        let details = service.get_element_details(folder_id).await.unwrap();

        // Assert

        assert!(details.source.is_none());
        assert!(details.derived_from_name.is_none());
        assert!(details.card_review.is_none());
        assert!(details.reading_review.is_none());
        assert_eq!(details.inherited_profile_name, Some("Default".to_string()));
    }

    #[tokio::test]
    async fn get_element_details_element_with_source_returns_resolved_source() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;
        let source_service = scope.resolve::<dyn SourceService>().await;
        let profile_repo = scope.resolve::<dyn StudyProfileRepository>().await;
        let service = scope.resolve::<dyn ElementDetailsService>().await;

        profile_repo.create(&make_profile(true)).await.unwrap();

        let source = source_service
            .create_or_reuse_source(SourceFields {
                title: "My source".into(),
                authors: None,
                publication_date: None,
                source_type: SourceType::File,
                location: None,
            })
            .await
            .unwrap();

        let folder_id = ElementId::Folder(Uuid::new_v4());
        meta_repo
            .create_meta(&Meta {
                source_id: Some(source.id),
                ..make_meta(folder_id, None)
            })
            .await
            .unwrap();

        // Act

        let details = service.get_element_details(folder_id).await.unwrap();

        // Assert

        assert_eq!(details.source.unwrap().source.id, source.id);
    }

    #[tokio::test]
    async fn get_element_details_element_with_derived_from_returns_derived_from_name() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;
        let profile_repo = scope.resolve::<dyn StudyProfileRepository>().await;
        let service = scope.resolve::<dyn ElementDetailsService>().await;

        profile_repo.create(&make_profile(true)).await.unwrap();

        let source_id = ElementId::Reading(Uuid::new_v4());
        meta_repo
            .create_meta(&Meta {
                name: "Source reading".into(),
                ..make_meta(source_id, None)
            })
            .await
            .unwrap();

        let extract_id = ElementId::Extract(Uuid::new_v4());
        meta_repo
            .create_meta(&Meta {
                derived_from: Some(source_id),
                ..make_meta(extract_id, None)
            })
            .await
            .unwrap();

        // Act

        let details = service.get_element_details(extract_id).await.unwrap();

        // Assert

        assert_eq!(
            details.derived_from_name,
            Some("Source reading".to_string())
        );
    }

    #[tokio::test]
    async fn get_element_details_card_with_review_returns_card_review() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let card_repo = scope.resolve::<dyn CardRepository>().await;
        let card_review_repo = scope.resolve::<dyn CardReviewRepository>().await;
        let profile_repo = scope.resolve::<dyn StudyProfileRepository>().await;
        let service = scope.resolve::<dyn ElementDetailsService>().await;

        profile_repo.create(&make_profile(true)).await.unwrap();

        let card_id = ElementId::Card(Uuid::new_v4());
        card_repo
            .create(Card {
                meta: make_meta(card_id, None),
                front: String::new(),
                back: String::new(),
            })
            .await
            .unwrap();
        card_review_repo
            .upsert(&CardReview {
                card_id: card_id.id(),
                due: Utc::now() + Duration::days(1),
                stability: 2.0,
                difficulty: 3.0,
                reps: 1,
                lapses: 0,
                state: CardState::Review,
                last_reviewed: Some(Utc::now()),
            })
            .await
            .unwrap();

        // Act

        let details = service.get_element_details(card_id).await.unwrap();

        // Assert

        assert_eq!(details.card_review.unwrap().card_id, card_id.id());
        assert!(details.reading_review.is_none());
    }

    #[tokio::test]
    async fn get_element_details_reading_with_review_returns_reading_review() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;
        let reading_review_repo = scope.resolve::<dyn ReadingReviewRepository>().await;
        let profile_repo = scope.resolve::<dyn StudyProfileRepository>().await;
        let service = scope.resolve::<dyn ElementDetailsService>().await;

        profile_repo.create(&make_profile(true)).await.unwrap();

        let reading_id = ElementId::Reading(Uuid::new_v4());
        meta_repo
            .create_meta(&make_meta(reading_id, None))
            .await
            .unwrap();
        reading_review_repo
            .upsert(&ReadingReview {
                element_id: reading_id,
                due: Utc::now() + Duration::days(5),
                interval_days: 5.0,
                last_reviewed: Some(Utc::now()),
                finished_at: None,
            })
            .await
            .unwrap();

        // Act

        let details = service.get_element_details(reading_id).await.unwrap();

        // Assert

        assert!(details.card_review.is_none());
        assert_eq!(details.reading_review.unwrap().element_id, reading_id);
    }

    #[tokio::test]
    async fn get_element_details_direct_profile_with_parent_returns_parent_name_as_inherited() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;
        let profile_repo = scope.resolve::<dyn StudyProfileRepository>().await;
        let service = scope.resolve::<dyn ElementDetailsService>().await;

        let default_profile = make_profile(true);
        profile_repo.create(&default_profile).await.unwrap();
        let parent_profile = make_profile(false);
        profile_repo.create(&parent_profile).await.unwrap();

        let parent_id = ElementId::Folder(Uuid::new_v4());
        meta_repo
            .create_meta(&Meta {
                study_profile_id: Some(parent_profile.id),
                ..make_meta(parent_id, None)
            })
            .await
            .unwrap();

        let own_profile = make_profile(false);
        profile_repo.create(&own_profile).await.unwrap();
        let child_id = ElementId::Folder(Uuid::new_v4());
        meta_repo
            .create_meta(&Meta {
                study_profile_id: Some(own_profile.id),
                ..make_meta(child_id, Some(parent_id))
            })
            .await
            .unwrap();

        // Act

        let details = service.get_element_details(child_id).await.unwrap();

        // Assert

        assert_eq!(details.inherited_profile_name, Some(parent_profile.name));
    }

    #[tokio::test]
    async fn get_element_details_inherited_profile_returns_own_profile_name_as_inherited() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;
        let profile_repo = scope.resolve::<dyn StudyProfileRepository>().await;
        let service = scope.resolve::<dyn ElementDetailsService>().await;

        profile_repo.create(&make_profile(true)).await.unwrap();
        let parent_profile = make_profile(false);
        profile_repo.create(&parent_profile).await.unwrap();

        let parent_id = ElementId::Folder(Uuid::new_v4());
        meta_repo
            .create_meta(&Meta {
                study_profile_id: Some(parent_profile.id),
                ..make_meta(parent_id, None)
            })
            .await
            .unwrap();

        let child_id = ElementId::Folder(Uuid::new_v4());
        meta_repo
            .create_meta(&make_meta(child_id, Some(parent_id)))
            .await
            .unwrap();

        // Act

        let details = service.get_element_details(child_id).await.unwrap();

        // Assert

        assert_eq!(details.inherited_profile_name, Some(parent_profile.name));
    }
}
