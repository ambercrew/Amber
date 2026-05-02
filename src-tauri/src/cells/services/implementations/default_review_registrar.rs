use std::sync::Arc;

use async_trait::async_trait;
use chrono::Utc;
use injector_derive::ScopeInjectable;

use crate::cells::{
    dto::update_repetition_request_dto::UpdateRepetitionRequestDto,
    entities::review::{Rating, Review},
    repositories::{cell_repository::CellRepository, review_repository::ReviewRepository},
    services::review_registrar::{ReviewRegistrar, ReviewRegistrarError},
};

#[derive(ScopeInjectable)]
pub struct DefaultReviewRegistrar {
    cell_repository: Arc<dyn CellRepository>,
    review_repository: Arc<dyn ReviewRepository>,
}

#[async_trait]
impl ReviewRegistrar for DefaultReviewRegistrar {
    async fn register_review(
        &self,
        repetition_update: UpdateRepetitionRequestDto,
        rating: Rating,
        study_time: u32,
    ) -> Result<(), ReviewRegistrarError> {
        log::info!(
            "Registering review for repetition with id {}, and rating {rating:?}, and study time of {study_time} seconds.",
            repetition_update.id
        );

        let mut cell = self
            .cell_repository
            .get_by_id(repetition_update.cell_id)
            .await?;
        if let Some(element) = cell
            .repetitions
            .iter_mut()
            .find(|r| r.id == repetition_update.id)
        {
            repetition_update.apply_update(element);
        } else {
            panic!("Cannot find repetition with specified id!");
        }
        self.cell_repository.update(&cell).await?;

        let review = Review::new(
            None,
            Some(cell.id()),
            study_time,
            Utc::now().to_utc(),
            rating,
        );
        self.review_repository.create(&review).await?;

        Ok(())
    }
}

#[cfg(test)]
pub mod tests {
    use chrono::Utc;
    use injector::{injector::Injector, register_scope};

    use crate::{
        Guid, ROOT_FOLDER_ID,
        cells::{
            dto::update_repetition_request_dto::UpdateRepetitionRequestDto,
            entities::cell::{Cell, CellType},
            repositories::cell_repository::CellRepository,
            repositories::review_repository::ReviewRepository,
            services::review_registrar::ReviewRegistrar,
        },
        file_system::{
            entities::file::File, repositories::file_repository::FileRepository,
            value_objects::fsrs_profile_choice::FsrsProfileChoice,
        },
        infrastructure::{
            extensions::unit_of_work::UnitOfWorkExt,
            repositories::sqlite::{
                sqlite_cell_repository::SqliteCellRepository,
                sqlite_file_repository::SqliteFileRepository,
                sqlite_review_repository::SqliteReviewRepository,
            },
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn CellRepository, SqliteCellRepository);
        register_scope!(injector, dyn ReviewRepository, SqliteReviewRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        register_scope!(injector, DefaultReviewRegistrar);
        injector
    }

    #[tokio::test]
    pub async fn register_review_updated_repetition_and_created_review() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<DefaultReviewRegistrar>().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let content = r#"
            <cloze index="1">Test</cloze>
        "#
        .to_string();
        let cell = Cell::new(None, file.id(), content, CellType::Cloze, 0);

        cell_repository.create(&cell).await.unwrap();
        scope.save_changes().await.unwrap();

        let repetition_update = UpdateRepetitionRequestDto {
            id: cell.repetitions()[0].id,
            cell_id: cell.id(),
            file_id: cell.file_id(),
            stability: 5.4f64,
            ..Default::default()
        };

        // Act

        service
            .register_review(repetition_update.clone(), Rating::Hard, 10)
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let actual = cell_repository.get_by_id(cell.id()).await.unwrap();

        assert_eq!(
            actual.repetitions()[0].stability,
            repetition_update.stability
        );

        let home_statistics = cell_repository.get_home_statistics().await.unwrap();
        assert_eq!(1, home_statistics.number_of_reviews);
    }
}
