use std::sync::Arc;

use crate::{
    Guid,
    cells::{
        entities::cell::{Cell, CellType},
        repositories::cell_repository::CellRepository,
        services::cell_content_updater::{CellContentUpdater, CellContentUpdaterError},
        value_objects::incremental_reading::IncrementalReading,
    },
    incremental_reading::{
        extracts::{
            entities::extract::Extract, highlight_parser::parse_highlights,
            repositories::extract_repository::ExtractRepository,
        },
        scheduling::{
            entities::incremental_reading_schedule::IncrementalReadingSchedule,
            repositories::incremental_reading_schedule_repository::IncrementalReadingScheduleRepository,
        },
    },
};
use async_trait::async_trait;
use injector_derive::ScopeInjectable;

#[derive(ScopeInjectable)]
pub struct DefaultCellContentUpdater {
    cell_repository: Arc<dyn CellRepository>,
    extract_repository: Arc<dyn ExtractRepository>,
    schedule_repository: Arc<dyn IncrementalReadingScheduleRepository>,
}

#[async_trait]
impl CellContentUpdater for DefaultCellContentUpdater {
    async fn update_cell_content(
        &self,
        cell_id: Guid,
        content: String,
    ) -> Result<(), CellContentUpdaterError> {
        let mut cell = self.cell_repository.get_by_id(cell_id).await?;
        cell.set_content(content);
        self.cell_repository.update(&cell).await?;

        if cell.cell_type() == &CellType::IncrementalReading {
            let ir: IncrementalReading = serde_json::from_str(cell.content())
                .expect("Cannot parse incremental reading JSON!");
            let extract_counts = self.sync_extracts(&cell, &ir).await?;
            self.sync_schedule(&cell, &ir, extract_counts).await?;
        }

        Ok(())
    }
}

impl DefaultCellContentUpdater {
    async fn sync_extracts(
        &self,
        cell: &Cell,
        ir: &IncrementalReading,
    ) -> Result<usize, CellContentUpdaterError> {
        let found: Vec<Guid> = parse_highlights(&ir.content.clone().unwrap_or_default())
            .into_keys()
            .map(|id| id.parse::<Guid>().unwrap_or_else(|_| Guid::new_v4()))
            .collect();

        log::info!("Found {} extracts.", found.len());

        let existing = self.extract_repository.get_by_cell_id(cell.id()).await?;

        for highlight_id in &found {
            let already_exists = existing.iter().any(|e| e.id() == *highlight_id);
            if !already_exists {
                let extract = Extract::new(*highlight_id, cell.id());
                self.extract_repository.create(&extract).await?;
            }
        }

        for existing_extract in &existing {
            if !found.iter().any(|id| *id == existing_extract.id()) {
                self.extract_repository
                    .delete_by_id(existing_extract.id())
                    .await?;
            }
        }

        Ok(found.len())
    }

    async fn sync_schedule(
        &self,
        cell: &Cell,
        ir: &IncrementalReading,
        extract_counts: usize,
    ) -> Result<(), CellContentUpdaterError> {
        let title = ir.title.clone().unwrap_or_default();
        let priority = ir.priority.clone();

        match self.schedule_repository.get_by_cell_id(cell.id()).await? {
            None => {
                let schedule = IncrementalReadingSchedule::new(
                    Guid::new_v4(),
                    cell.id(),
                    priority,
                    title,
                    extract_counts > 0,
                    ir.completed,
                );
                self.schedule_repository.create(&schedule).await?;
            }
            Some(mut existing) => {
                existing.set_priority(priority);
                existing.set_title(title);
                existing.set_completed(ir.completed);
                existing.set_has_extracts(extract_counts > 0);
                self.schedule_repository.update(&existing).await?;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use injector::{injector::Injector, register_scope};

    use crate::{
        ROOT_FOLDER_ID,
        cells::{
            entities::cell::{Cell, CellType},
            repositories::cell_repository::CellRepository,
            services::cell_content_updater::CellContentUpdater,
            value_objects::incremental_reading::{
                IncrementalReading, IncrementalReadingPriority, IncrementalReadingSource,
            },
        },
        file_system::{
            entities::file::File, repositories::file_repository::FileRepository,
            value_objects::fsrs_profile_choice::FsrsProfileChoice,
        },
        incremental_reading::{
            extracts::repositories::extract_repository::ExtractRepository,
            scheduling::repositories::incremental_reading_schedule_repository::IncrementalReadingScheduleRepository,
        },
        infrastructure::{
            extensions::unit_of_work::UnitOfWorkExt,
            repositories::sqlite::{
                sqlite_cell_repository::SqliteCellRepository,
                sqlite_extract_repository::SqliteExtractRepository,
                sqlite_file_repository::SqliteFileRepository,
                sqlite_incremental_reading_schedule_repository::SqliteIncrementalReadingScheduleRepository,
            },
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn CellRepository, SqliteCellRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        register_scope!(injector, dyn ExtractRepository, SqliteExtractRepository);
        register_scope!(
            injector,
            dyn IncrementalReadingScheduleRepository,
            SqliteIncrementalReadingScheduleRepository
        );
        register_scope!(injector, DefaultCellContentUpdater);
        injector
    }

    fn ir_content(html: &str) -> String {
        serde_json::to_string(&IncrementalReading {
            content: Some(html.to_string()),
            title: Some("Test".to_string()),
            source: IncrementalReadingSource {
                source_type: "url".to_string(),
                url: "https://example.com".to_string(),
            },
            priority: IncrementalReadingPriority::Normal,
            completed: false,
            scroll_position: None,
        })
        .unwrap()
    }

    async fn create_test_file(file_repository: &Arc<dyn FileRepository>) -> File {
        let file = File::new_unchecked(
            Guid::new_v4(),
            chrono::Utc::now(),
            chrono::Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();
        file
    }

    #[tokio::test]
    pub async fn update_cell_content_creates_extract_for_new_highlight() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let extract_repository = scope.resolve::<dyn ExtractRepository>().await;
        let service = scope.resolve::<DefaultCellContentUpdater>().await;

        let file = create_test_file(&file_repository).await;
        let cell = Cell::new(
            None,
            file.id(),
            ir_content(""),
            CellType::IncrementalReading,
            0,
        );
        cell_repository.create(&cell).await.unwrap();
        scope.save_changes().await.unwrap();

        let highlight_id = "550e8400-e29b-41d4-a716-446655440000";
        let content = ir_content(&format!(
            r#"<highlight highlight-id="{highlight_id}">some text</highlight>"#
        ));

        // Act

        service
            .update_cell_content(cell.id(), content)
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let extracts = extract_repository.get_by_cell_id(cell.id()).await.unwrap();
        assert_eq!(1, extracts.len());
        assert_eq!(highlight_id, extracts[0].id().to_string());
    }

    #[tokio::test]
    pub async fn update_cell_content_deletes_extract_when_highlight_removed() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let extract_repository = scope.resolve::<dyn ExtractRepository>().await;
        let service = scope.resolve::<DefaultCellContentUpdater>().await;

        let file = create_test_file(&file_repository).await;
        let highlight_id = "550e8400-e29b-41d4-a716-446655440000";
        let content_with = ir_content(&format!(
            r#"<highlight highlight-id="{highlight_id}">some text</highlight>"#
        ));
        let cell = Cell::new(
            None,
            file.id(),
            ir_content(""),
            CellType::IncrementalReading,
            0,
        );
        cell_repository.create(&cell).await.unwrap();
        scope.save_changes().await.unwrap();

        service
            .update_cell_content(cell.id(), content_with)
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        service
            .update_cell_content(cell.id(), ir_content("no highlights here"))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let extracts = extract_repository.get_by_cell_id(cell.id()).await.unwrap();
        assert_eq!(0, extracts.len());
    }

    #[tokio::test]
    pub async fn update_cell_content_does_not_create_extracts_for_note_cell() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let extract_repository = scope.resolve::<dyn ExtractRepository>().await;
        let service = scope.resolve::<DefaultCellContentUpdater>().await;

        let file = create_test_file(&file_repository).await;
        let highlight_id = "550e8400-e29b-41d4-a716-446655440000";
        let cell = Cell::new(None, file.id(), "".to_string(), CellType::Note, 0);
        cell_repository.create(&cell).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        service
            .update_cell_content(
                cell.id(),
                format!(r#"<highlight highlight-id="{highlight_id}">some text</highlight>"#),
            )
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let extracts = extract_repository.get_by_cell_id(cell.id()).await.unwrap();
        assert_eq!(0, extracts.len());
    }

    #[tokio::test]
    pub async fn update_cell_content_creates_schedule_on_first_update() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let schedule_repository = scope
            .resolve::<dyn IncrementalReadingScheduleRepository>()
            .await;
        let service = scope.resolve::<DefaultCellContentUpdater>().await;

        let file = create_test_file(&file_repository).await;
        let cell = Cell::new(
            None,
            file.id(),
            ir_content(""),
            CellType::IncrementalReading,
            0,
        );
        cell_repository.create(&cell).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        service
            .update_cell_content(cell.id(), ir_content("some content"))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let schedule = schedule_repository.get_by_cell_id(cell.id()).await.unwrap();
        assert!(schedule.is_some());
        let schedule = schedule.unwrap();
        assert_eq!("Test", schedule.title());
        assert!(!schedule.has_extracts());
    }

    #[tokio::test]
    pub async fn update_cell_content_sets_has_extracts_when_highlights_present() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let schedule_repository = scope
            .resolve::<dyn IncrementalReadingScheduleRepository>()
            .await;
        let service = scope.resolve::<DefaultCellContentUpdater>().await;

        let file = create_test_file(&file_repository).await;
        let highlight_id = "550e8400-e29b-41d4-a716-446655440000";
        let cell = Cell::new(
            None,
            file.id(),
            ir_content(""),
            CellType::IncrementalReading,
            0,
        );
        cell_repository.create(&cell).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        service
            .update_cell_content(
                cell.id(),
                ir_content(&format!(
                    r#"<highlight highlight-id="{highlight_id}">text</highlight>"#
                )),
            )
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let schedule = schedule_repository
            .get_by_cell_id(cell.id())
            .await
            .unwrap()
            .unwrap();
        assert!(schedule.has_extracts());
    }
}
