use std::sync::Arc;

use chrono::Utc;
use injector_derive::ScopeInjectable;
use thiserror::Error;

use crate::{
    Guid,
    cells::{
        entities::{
            cell::{Cell, CellType},
            review::{Rating, Review},
        },
        models::cell_deletion_request::CellDeletionRequest,
        repositories::{
            cell_repository::{CellRepository, MoveDirection},
            review_repository::ReviewRepository,
        },
        value_objects::repetition_update::RepetitionUpdate,
    },
    common::repository_error::RepositoryError,
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum CellServiceError {
    #[error(transparent)]
    UnknownRepositoryError(#[from] RepositoryError),
}

#[derive(ScopeInjectable)]
pub struct CellService {
    cell_repository: Arc<dyn CellRepository>,
    review_repository: Arc<dyn ReviewRepository>,
}

impl CellService {
    pub async fn create_cell(
        &self,
        file_id: Guid,
        content: String,
        cell_type: CellType,
        index: u32,
    ) -> Result<Guid, CellServiceError> {
        log::info!(
            "Creating cell on file with id {file_id}, and cell type {cell_type}, and index {index}"
        );

        let cell = Cell::new(None, file_id, content, cell_type, index);

        self.cell_repository
            .move_cells_indices_starting_from(file_id, index, MoveDirection::Down)
            .await?;
        self.cell_repository.create(&cell).await?;

        Ok(cell.id())
    }

    pub async fn delete_by_id(&self, id: Guid) -> Result<(), CellServiceError> {
        log::info!("Deleting cell with id {id}.");
        let cell = self.cell_repository.get_by_id(id).await?;

        self.cell_repository
            .delete_by_id(CellDeletionRequest::new(id))
            .await?;

        self.cell_repository
            .move_cells_indices_starting_from(cell.file_id(), cell.index(), MoveDirection::Up)
            .await?;
        Ok(())
    }

    pub async fn move_cell(&self, id: Guid, new_index: u32) -> Result<(), CellServiceError> {
        log::info!("Moving cell with id {id} to new index {new_index}.");
        let mut cell = self.cell_repository.get_by_id(id).await?;

        self.cell_repository
            .move_cells_indices_starting_from(cell.file_id(), cell.index() + 1, MoveDirection::Up)
            .await?;

        self.cell_repository
            .move_cells_indices_starting_from(cell.file_id(), new_index, MoveDirection::Down)
            .await?;

        cell.set_index(new_index);
        self.cell_repository.update(&cell).await?;

        Ok(())
    }

    pub async fn register_review(
        &self,
        repetition_update: RepetitionUpdate,
        rating: Rating,
        study_time: u32,
    ) -> Result<(), CellServiceError> {
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

    /// This method is used to enforce all invariants on the cell with the given id. By default all
    /// invariants should be enforced, but in some cases (like sync), you may need to
    /// call this method, to reinforce invariants that got broken in sync.
    /// The business invariants enforce in this calls are:
    /// 1. Ensuring no two cells has the same index.
    pub async fn enforce_cell_invariants_on_cell(&self, id: Guid) -> Result<(), CellServiceError> {
        log::info!("Enforcing cell invariants on cell with id {id}.");

        let cell = self.cell_repository.get_by_id(id).await?;

        if self
            .cell_repository
            .get_number_of_cells_in_file_with_index(cell.file_id(), cell.index())
            .await?
            > 1
        {
            // Ensuring that no two cells has the same index
            self.cell_repository
                .move_cells_indices_starting_from(cell.file_id(), cell.index(), MoveDirection::Down)
                .await?;
            // Updating to keep the old index.
            self.cell_repository.update(&cell).await?;
        }

        Ok(())
    }
}

#[cfg(test)]
pub mod tests {
    use injector::{injector::Injector, register_scope};

    use crate::{
        ROOT_FOLDER_ID,
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
        register_scope!(injector, CellService);
        injector
    }

    #[tokio::test]
    pub async fn create_cell_moved_all_cells_down_and_created_cell() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<CellService>().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let cells = [
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 0),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 1),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 2),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 3),
        ];

        cell_repository.create(&cells[0]).await.unwrap();
        cell_repository.create(&cells[1]).await.unwrap();
        cell_repository.create(&cells[2]).await.unwrap();
        cell_repository.create(&cells[3]).await.unwrap();

        scope.save_changes().await.unwrap();

        // Act

        let actual = service
            .create_cell(file.id(), "".to_string(), CellType::Cloze, 2)
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let actual_cells = cell_repository
            .get_file_cells_ordered_by_index(file.id())
            .await
            .unwrap();
        assert_eq!(actual_cells[0].id(), cells[0].id());
        assert_eq!(actual_cells[1].id(), cells[1].id());
        assert_eq!(actual_cells[2].id(), actual);
        assert_eq!(actual_cells[3].id(), cells[2].id());
        assert_eq!(actual_cells[4].id(), cells[3].id());
    }

    #[tokio::test]
    pub async fn delete_by_id_moved_all_cells_up_and_deleted_cell() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<CellService>().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let cells = [
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 0),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 1),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 2),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 3),
        ];

        cell_repository.create(&cells[0]).await.unwrap();
        cell_repository.create(&cells[1]).await.unwrap();
        cell_repository.create(&cells[2]).await.unwrap();
        cell_repository.create(&cells[3]).await.unwrap();

        scope.save_changes().await.unwrap();

        // Act

        service.delete_by_id(cells[1].id()).await.unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let actual_cells = cell_repository
            .get_file_cells_ordered_by_index(file.id())
            .await
            .unwrap();

        assert_eq!(actual_cells[0].id(), cells[0].id());
        assert_eq!(actual_cells[0].index(), 0);

        assert_eq!(actual_cells[1].id(), cells[2].id());
        assert_eq!(actual_cells[1].index(), 1);

        assert_eq!(actual_cells[2].id(), cells[3].id());
        assert_eq!(actual_cells[2].index(), 2);
    }

    #[tokio::test]
    pub async fn move_cell_forward_moved_cell_correctly() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<CellService>().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let cells = [
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 0),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 1),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 2),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 3),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 4),
        ];

        cell_repository.create(&cells[0]).await.unwrap();
        cell_repository.create(&cells[1]).await.unwrap();
        cell_repository.create(&cells[2]).await.unwrap();
        cell_repository.create(&cells[3]).await.unwrap();
        cell_repository.create(&cells[4]).await.unwrap();

        scope.save_changes().await.unwrap();

        // Act

        service.move_cell(cells[1].id(), 3).await.unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let actual_cells = cell_repository
            .get_file_cells_ordered_by_index(file.id())
            .await
            .unwrap();

        assert_eq!(actual_cells[0].id(), cells[0].id());
        assert_eq!(actual_cells[0].index(), 0);

        assert_eq!(actual_cells[1].id(), cells[2].id());
        assert_eq!(actual_cells[1].index(), 1);

        assert_eq!(actual_cells[2].id(), cells[3].id());
        assert_eq!(actual_cells[2].index(), 2);

        assert_eq!(actual_cells[3].id(), cells[1].id());
        assert_eq!(actual_cells[3].index(), 3);

        assert_eq!(actual_cells[4].id(), cells[4].id());
        assert_eq!(actual_cells[4].index(), 4);
    }

    #[tokio::test]
    pub async fn move_cell_backward_moved_cell_correctly() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<CellService>().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let cells = [
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 0),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 1),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 2),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 3),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 4),
        ];

        cell_repository.create(&cells[0]).await.unwrap();
        cell_repository.create(&cells[1]).await.unwrap();
        cell_repository.create(&cells[2]).await.unwrap();
        cell_repository.create(&cells[3]).await.unwrap();
        cell_repository.create(&cells[4]).await.unwrap();

        scope.save_changes().await.unwrap();

        // Act

        service.move_cell(cells[3].id(), 1).await.unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let actual_cells = cell_repository
            .get_file_cells_ordered_by_index(file.id())
            .await
            .unwrap();

        assert_eq!(actual_cells[0].id(), cells[0].id());
        assert_eq!(actual_cells[0].index(), 0);

        assert_eq!(actual_cells[1].id(), cells[3].id());
        assert_eq!(actual_cells[1].index(), 1);

        assert_eq!(actual_cells[2].id(), cells[1].id());
        assert_eq!(actual_cells[2].index(), 2);

        assert_eq!(actual_cells[3].id(), cells[2].id());
        assert_eq!(actual_cells[3].index(), 3);

        assert_eq!(actual_cells[4].id(), cells[4].id());
        assert_eq!(actual_cells[4].index(), 4);
    }

    #[tokio::test]
    pub async fn register_review_updated_repetition_and_created_review() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<CellService>().await;

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

        let repetition_update = RepetitionUpdate {
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

    #[tokio::test]
    pub async fn enforce_cell_invariants_on_cell_two_cells_with_same_index_updated_index() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<CellService>().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let cells = [
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 0),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 0),
        ];

        cell_repository.create(&cells[0]).await.unwrap();
        cell_repository.create(&cells[1]).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        service
            .enforce_cell_invariants_on_cell(cells[0].id())
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let actual_cells = cell_repository
            .get_file_cells_ordered_by_index(file.id())
            .await
            .unwrap();

        assert_eq!(actual_cells[0].id(), cells[0].id());
        assert_eq!(actual_cells[0].index(), 0);

        assert_eq!(actual_cells[1].id(), cells[1].id());
        assert_eq!(actual_cells[1].index(), 1);
    }
}
