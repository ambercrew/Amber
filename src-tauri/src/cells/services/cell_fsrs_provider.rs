use async_trait::async_trait;
use thiserror::Error;

use crate::{
    Guid, cells::dto::cell_with_fsrs_profile_id_dto::CellWithFsrsProfileIdDto,
    common::repository_error::RepositoryError,
    fsrs::services::fsrs_profile_resolver::FsrsProfileResolverError,
};

#[derive(Error, Debug)]
pub enum CellFsrsProviderError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error(transparent)]
    FsrsProfileResolver(#[from] FsrsProfileResolverError),
}

#[async_trait]
pub trait CellFsrsProvider: Send + Sync {
    async fn get_cells_with_fsrs_profile_ids(
        &self,
        file_ids: Vec<Guid>,
    ) -> Result<Vec<CellWithFsrsProfileIdDto>, CellFsrsProviderError>;
}
