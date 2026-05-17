use async_trait::async_trait;
use thiserror::Error;
use tokio::sync::Mutex;

use crate::{
    backend::clients::brainy_backend_client::BrainyBackendClientError,
    common::repository_error::RepositoryError,
    sync::strategies::sync_entity_strategy::SyncEntityStrategyError,
};

#[derive(Error, Debug)]
pub enum SyncError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error(transparent)]
    Client(#[from] BrainyBackendClientError),
    #[error(transparent)]
    Strategy(#[from] SyncEntityStrategyError),
    #[error("Failed to decode base64-encoded sync entity data.")]
    Base64Decode(#[from] base64::DecodeError),
    #[error("Failed to decode protobuf payload of sync entity.")]
    ProstDecode(#[from] prost::DecodeError),
}

pub struct SyncLock(pub Mutex<()>);

#[async_trait]
pub trait Syncer: Send + Sync {
    async fn sync_with_backend(&self) -> Result<(), SyncError>;
}
