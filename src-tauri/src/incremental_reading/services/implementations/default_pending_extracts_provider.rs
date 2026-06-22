use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    cells::{
        repositories::cell_repository::CellRepository,
        value_objects::incremental_reading::IncrementalReading,
    },
    incremental_reading::{
        dto::pending_extract_dto::PendingExtractDto,
        extracts::{
            entities::extract::ExtractStatus, highlight_parser::parse_highlights,
            repositories::extract_repository::ExtractRepository,
        },
        services::pending_extracts_provider::{
            PendingExtractsProvider, PendingExtractsProviderError,
        },
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultPendingExtractsProvider {
    cell_repository: Arc<dyn CellRepository>,
    extract_repository: Arc<dyn ExtractRepository>,
}

#[async_trait]
impl PendingExtractsProvider for DefaultPendingExtractsProvider {
    async fn get_with_content(
        &self,
        cell_id: Guid,
    ) -> Result<Vec<PendingExtractDto>, PendingExtractsProviderError> {
        let cell = self.cell_repository.get_by_id(cell_id).await?;
        let extracts = self.extract_repository.get_by_cell_id(cell_id).await?;

        let ir: IncrementalReading = serde_json::from_str(cell.content())
            .map_err(|e| PendingExtractsProviderError::InvalidContent(e.to_string()))?;

        let highlights = parse_highlights(&ir.content.unwrap_or_default());

        let result = extracts
            .into_iter()
            .filter(|e| e.status() == &ExtractStatus::Pending)
            .filter_map(|extract| {
                let inner_html = highlights.get(&extract.id().to_string())?.clone();
                Some(PendingExtractDto {
                    id: extract.id().to_string(),
                    inner_html,
                })
            })
            .collect();

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use injector::{injector::Injector, register_scope};

    use crate::{
        ROOT_FOLDER_ID,
        cells::{
            entities::cell::{Cell, CellType},
            value_objects::incremental_reading::{
                IncrementalReadingPriority, IncrementalReadingSource,
            },
        },
        file_system::{
            entities::file::File, repositories::file_repository::FileRepository,
            value_objects::fsrs_profile_choice::FsrsProfileChoice,
        },
        incremental_reading::extracts::entities::extract::Extract,
        infrastructure::{
            extensions::unit_of_work::UnitOfWorkExt,
            repositories::sqlite::{
                sqlite_cell_repository::SqliteCellRepository,
                sqlite_extract_repository::SqliteExtractRepository,
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
        register_scope!(injector, dyn ExtractRepository, SqliteExtractRepository);
        register_scope!(injector, DefaultPendingExtractsProvider);
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

    fn create_test_cell(file_id: Guid, content: String) -> Cell {
        Cell::new_unchecked(
            Guid::new_v4(),
            chrono::Utc::now(),
            chrono::Utc::now(),
            file_id,
            content,
            CellType::IncrementalReading,
            0,
            "".to_string(),
            Vec::new(),
        )
    }

    #[tokio::test]
    async fn get_with_content_pending_extract_returns_dto_with_inner_html() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let extract_repository = scope.resolve::<dyn ExtractRepository>().await;
        let provider = scope.resolve::<DefaultPendingExtractsProvider>().await;

        let file = create_test_file(&file_repository).await;
        let highlight_id = Guid::new_v4();
        let content = ir_content(&format!(
            r#"<highlight highlight-id="{highlight_id}">some text</highlight>"#
        ));
        let cell = create_test_cell(file.id(), content);
        cell_repository.create(&cell).await.unwrap();

        let extract = Extract::new(highlight_id, cell.id());
        extract_repository.create(&extract).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let result = provider.get_with_content(cell.id()).await.unwrap();

        // Assert

        assert_eq!(1, result.len());
        assert_eq!(highlight_id.to_string(), result[0].id);
        assert_eq!("<p>some text</p>", result[0].inner_html);
    }

    #[tokio::test]
    async fn get_with_content_non_pending_extract_excluded_from_result() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let extract_repository = scope.resolve::<dyn ExtractRepository>().await;
        let provider = scope.resolve::<DefaultPendingExtractsProvider>().await;

        let file = create_test_file(&file_repository).await;
        let highlight_id = Guid::new_v4();
        let content = ir_content(&format!(
            r#"<highlight highlight-id="{highlight_id}">some text</highlight>"#
        ));
        let cell = create_test_cell(file.id(), content);
        cell_repository.create(&cell).await.unwrap();

        let mut extract = Extract::new(highlight_id, cell.id());
        extract.set_status(ExtractStatus::Added);
        extract_repository.create(&extract).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let result = provider.get_with_content(cell.id()).await.unwrap();

        // Assert

        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn get_with_content_extract_missing_highlight_excluded_from_result() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let extract_repository = scope.resolve::<dyn ExtractRepository>().await;
        let provider = scope.resolve::<DefaultPendingExtractsProvider>().await;

        let file = create_test_file(&file_repository).await;
        let cell = create_test_cell(file.id(), ir_content(""));
        cell_repository.create(&cell).await.unwrap();

        let extract = Extract::new(Guid::new_v4(), cell.id());
        extract_repository.create(&extract).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let result = provider.get_with_content(cell.id()).await.unwrap();

        // Assert

        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn get_with_content_highlight_split_across_multiple_tags_accumulates_inner_html() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let extract_repository = scope.resolve::<dyn ExtractRepository>().await;
        let provider = scope.resolve::<DefaultPendingExtractsProvider>().await;

        let file = create_test_file(&file_repository).await;
        let highlight_id = Guid::new_v4();
        let content = ir_content(&format!(
            r#"<highlight highlight-id="{highlight_id}">first part</highlight> in between <highlight highlight-id="{highlight_id}">second part</highlight>"#
        ));
        let cell = create_test_cell(file.id(), content);
        cell_repository.create(&cell).await.unwrap();

        let extract = Extract::new(highlight_id, cell.id());
        extract_repository.create(&extract).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let result = provider.get_with_content(cell.id()).await.unwrap();

        // Assert

        assert_eq!(1, result.len());
        assert_eq!("<p>first part</p><p>second part</p>", result[0].inner_html);
    }
}
