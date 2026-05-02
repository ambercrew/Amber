use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    cells::{
        repositories::cell_repository::{CellRepository, MoveDirection},
        services::cell_invariants_enforcer::{CellInvariantsEnforcer, CellInvariantsEnforcerError},
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultCellInvariantsEnforcer {
    cell_repository: Arc<dyn CellRepository>,
}

#[async_trait]
impl CellInvariantsEnforcer for DefaultCellInvariantsEnforcer {
    async fn enforce_cell_invariants_on_cell(
        &self,
        id: Guid,
    ) -> Result<(), CellInvariantsEnforcerError> {
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
    use chrono::Utc;
    use injector::{injector::Injector, register_scope};

    use crate::{
        Guid, ROOT_FOLDER_ID,
        cells::{
            entities::cell::{Cell, CellType},
            repositories::cell_repository::CellRepository,
            services::cell_invariants_enforcer::CellInvariantsEnforcer,
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
        register_scope!(injector, DefaultCellInvariantsEnforcer);
        injector
    }

    #[tokio::test]
    pub async fn enforce_cell_invariants_on_cell_two_cells_with_same_index_updated_index() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let service = scope.resolve::<DefaultCellInvariantsEnforcer>().await;

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
