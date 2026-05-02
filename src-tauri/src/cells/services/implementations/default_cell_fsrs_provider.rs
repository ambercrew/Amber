use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    cells::{
        dto::cell_with_fsrs_profile_id_dto::CellWithFsrsProfileIdDto,
        repositories::cell_repository::CellRepository,
        services::cell_fsrs_provider::{CellFsrsProvider, CellFsrsProviderError},
    },
    file_system::repositories::file_repository::FileRepository,
    fsrs::services::fsrs_profile_resolver::FsrsProfileResolver,
};

#[derive(ScopeInjectable)]
pub struct DefaultCellFsrsProvider {
    file_repository: Arc<dyn FileRepository>,
    cell_repository: Arc<dyn CellRepository>,
    fsrs_profile_resolver: Arc<dyn FsrsProfileResolver>,
}

#[async_trait]
impl CellFsrsProvider for DefaultCellFsrsProvider {
    async fn get_cells_with_fsrs_profile_ids(
        &self,
        file_ids: Vec<Guid>,
    ) -> Result<Vec<CellWithFsrsProfileIdDto>, CellFsrsProviderError> {
        let mut result = Vec::new();

        for file_id in file_ids {
            let file = self.file_repository.get_by_id(file_id).await?;
            let fsrs_profile = self
                .fsrs_profile_resolver
                .get_for_item(file.fsrs_profile_choice(), file.parent_id())
                .await?;

            let mut cells = self
                .cell_repository
                .get_file_cells_ordered_by_index(file_id)
                .await?
                .into_iter()
                .map(|cell| CellWithFsrsProfileIdDto {
                    cell,
                    fsrs_profile_id: fsrs_profile.id(),
                })
                .collect::<Vec<_>>();

            result.append(&mut cells);
        }

        Ok(result)
    }
}
