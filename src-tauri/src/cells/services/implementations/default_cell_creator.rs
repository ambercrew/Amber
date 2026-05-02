use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    cells::{
        dto::create_cell_request_dto::CreateCellRequestDto,
        entities::cell::Cell,
        repositories::cell_repository::{CellRepository, MoveDirection},
        services::cell_creator::{CellCreator, CellCreatorError},
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultCellCreator {
    cell_repository: Arc<dyn CellRepository>,
}

#[async_trait]
impl CellCreator for DefaultCellCreator {
    async fn create_cell(&self, request: CreateCellRequestDto) -> Result<Guid, CellCreatorError> {
        log::info!(
            "Creating cell on file with id {}, and cell type {}, and index {}",
            request.file_id,
            request.cell_type,
            request.index
        );

        let cell = Cell::new(
            None,
            request.file_id,
            request.content,
            request.cell_type,
            request.index,
        );

        self.cell_repository
            .move_cells_indices_starting_from(cell.file_id(), cell.index(), MoveDirection::Down)
            .await?;
        self.cell_repository.create(&cell).await?;

        Ok(cell.id())
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
            services::cell_creator::CellCreator,
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
        register_scope!(injector, DefaultCellCreator);
        injector
    }

    #[tokio::test]
    pub async fn create_cell_moved_all_cells_down_and_created_cell() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<DefaultCellCreator>().await;

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
            .create_cell(CreateCellRequestDto {
                file_id: file.id(),
                content: "".to_string(),
                cell_type: CellType::Cloze,
                index: 2,
            })
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
}
