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
/// fresh one in its place, without ending the scope. Useful for releasing a
/// long-held read snapshot before a slow, non-database operation (e.g. an
/// LLM round-trip) that would otherwise keep it open for the operation's
/// whole duration and risk a stale-snapshot conflict on the next write.
#[async_trait]
#[cfg_attr(test, automock)]
pub trait TransactionManager: Send + Sync {
    async fn save_changes(&self) -> Result<(), TransactionManagerError>;
}
