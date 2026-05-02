use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    cells::{
        repositories::cell_repository::{CellDeletionRequest, CellRepository, MoveDirection},
        services::cell_deleter::{CellDeleter, CellDeleterError},
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultCellDeleter {
    cell_repository: Arc<dyn CellRepository>,
}

#[async_trait]
impl CellDeleter for DefaultCellDeleter {
    async fn delete_by_id(&self, id: Guid) -> Result<(), CellDeleterError> {
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
            services::cell_deleter::CellDeleter,
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
        register_scope!(injector, DefaultCellDeleter);
        injector
    }

    #[tokio::test]
    pub async fn delete_by_id_moved_all_cells_up_and_deleted_cell() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<DefaultCellDeleter>().await;

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
}
