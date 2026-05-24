use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    cells::{
        repositories::cell_repository::{CellRepository, MoveDirection},
        services::cell_mover::{CellMover, CellMoverError},
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultCellMover {
    cell_repository: Arc<dyn CellRepository>,
}

#[async_trait]
impl CellMover for DefaultCellMover {
    async fn move_cell(&self, id: Guid, new_index: u32) -> Result<(), CellMoverError> {
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

    async fn move_cell_to_file(&self, cell_id: Guid, file_id: Guid) -> Result<(), CellMoverError> {
        let mut cell = self.cell_repository.get_by_id(cell_id).await?;

        if cell.file_id() == file_id {
            return Ok(());
        }

        log::info!("Movig cell with id {cell_id} to file with id {file_id}.");

        self.cell_repository
            .move_cells_indices_starting_from(cell.file_id(), cell.index() + 1, MoveDirection::Up)
            .await?;

        let new_index = self
            .cell_repository
            .get_number_of_cells_in_file(file_id)
            .await?;
        cell.set_index(new_index);
        cell.set_file_id(file_id);
        self.cell_repository.update(&cell).await?;

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
            entities::cell::{Cell, CellType},
            repositories::cell_repository::CellRepository,
            services::cell_mover::CellMover,
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
            },
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn CellRepository, SqliteCellRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        register_scope!(injector, DefaultCellMover);
        injector
    }

    #[tokio::test]
    pub async fn move_cell_forward_moved_cell_correctly() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<DefaultCellMover>().await;

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
        let service = scope.resolve::<DefaultCellMover>().await;

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
    pub async fn move_cell_to_file_same_file_does_nothing() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<DefaultCellMover>().await;

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
        ];
        cell_repository.create(&cells[0]).await.unwrap();
        cell_repository.create(&cells[1]).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        service
            .move_cell_to_file(cells[0].id(), file.id())
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let actual_cells = cell_repository
            .get_file_cells_ordered_by_index(file.id())
            .await
            .unwrap();

        assert_eq!(actual_cells.len(), 2);
        assert_eq!(actual_cells[0].id(), cells[0].id());
        assert_eq!(actual_cells[0].index(), 0);
        assert_eq!(actual_cells[1].id(), cells[1].id());
        assert_eq!(actual_cells[1].index(), 1);
    }

    #[tokio::test]
    pub async fn move_cell_to_file_different_file_appends_cell_to_target_file() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<DefaultCellMover>().await;

        let source_file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "source".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        let target_file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "target".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&source_file).await.unwrap();
        file_repository.create(&target_file).await.unwrap();

        let source_cells = [
            Cell::new(None, source_file.id(), "".to_string(), CellType::Note, 0),
            Cell::new(None, source_file.id(), "".to_string(), CellType::Note, 1),
        ];
        let target_cell = Cell::new(None, target_file.id(), "".to_string(), CellType::Note, 0);

        cell_repository.create(&source_cells[0]).await.unwrap();
        cell_repository.create(&source_cells[1]).await.unwrap();
        cell_repository.create(&target_cell).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        service
            .move_cell_to_file(source_cells[0].id(), target_file.id())
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let actual_target_cells = cell_repository
            .get_file_cells_ordered_by_index(target_file.id())
            .await
            .unwrap();

        assert_eq!(actual_target_cells.len(), 2);
        assert_eq!(actual_target_cells[0].id(), target_cell.id());
        assert_eq!(actual_target_cells[0].index(), 0);
        assert_eq!(actual_target_cells[1].id(), source_cells[0].id());
        assert_eq!(actual_target_cells[1].index(), 1);
    }

    #[tokio::test]
    pub async fn move_cell_to_file_different_file_updates_source_file_indices() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<DefaultCellMover>().await;

        let source_file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "source".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        let target_file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "target".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&source_file).await.unwrap();
        file_repository.create(&target_file).await.unwrap();

        let source_cells = [
            Cell::new(None, source_file.id(), "".to_string(), CellType::Note, 0),
            Cell::new(None, source_file.id(), "".to_string(), CellType::Note, 1),
            Cell::new(None, source_file.id(), "".to_string(), CellType::Note, 2),
        ];
        cell_repository.create(&source_cells[0]).await.unwrap();
        cell_repository.create(&source_cells[1]).await.unwrap();
        cell_repository.create(&source_cells[2]).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        service
            .move_cell_to_file(source_cells[0].id(), target_file.id())
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let actual_source_cells = cell_repository
            .get_file_cells_ordered_by_index(source_file.id())
            .await
            .unwrap();

        assert_eq!(actual_source_cells.len(), 2);
        assert_eq!(actual_source_cells[0].id(), source_cells[1].id());
        assert_eq!(actual_source_cells[0].index(), 0);
        assert_eq!(actual_source_cells[1].id(), source_cells[2].id());
        assert_eq!(actual_source_cells[1].index(), 1);
    }
}
