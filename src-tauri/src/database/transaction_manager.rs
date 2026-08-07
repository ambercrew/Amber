use async_trait::async_trait;
use thiserror::Error;

#[cfg(test)]
use mockall::automock;

use crate::SourceError;

#[derive(Error, Debug)]
pub enum TransactionManagerError {
    #[error("Failed to commit the current transaction")]
    CommitFailed(#[source] SourceError),
}

/// Commits the scope's currently open transaction and immediately opens a
/// fresh one in its place, without ending the scope. Also emits any events
/// queued during the scope, once the commit has succeeded.
#[async_trait]
#[cfg_attr(test, automock)]
pub trait TransactionManager: Send + Sync {
    async fn save_changes(&self) -> Result<(), TransactionManagerError>;
}
