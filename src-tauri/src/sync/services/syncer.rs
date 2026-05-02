use async_trait::async_trait;
use thiserror::Error;
use tokio::sync::Mutex;

use crate::{
    backend::clients::brainy_backend_client::BrainyBackendClientError,
    cells::services::cell_invariants_enforcer::CellInvariantsEnforcerError,
    common::repository_error::RepositoryError,
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum SyncError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error(transparent)]
    Client(#[from] BrainyBackendClientError),
    #[error(transparent)]
    CellInvariantsEnforcer(#[from] CellInvariantsEnforcerError),
}

pub struct SyncLock(pub Mutex<()>);

#[async_trait]
pub trait Syncer: Send + Sync {
    async fn sync_with_backend(&self) -> Result<(), SyncError>;
}
