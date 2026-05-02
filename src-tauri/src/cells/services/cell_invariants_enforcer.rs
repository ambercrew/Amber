use async_trait::async_trait;
use thiserror::Error;

use crate::{Guid, common::repository_error::RepositoryError};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum CellInvariantsEnforcerError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait CellInvariantsEnforcer: Send + Sync {
    /// This method is used to enforce all invariants on the cell with the given id. By default all
    /// invariants should be enforced, but in some cases (like sync), you may need to
    /// call this method, to reinforce invariants that got broken in sync.
    /// The business invariants enforce in this calls are:
    /// 1. Ensuring no two cells has the same index.
    async fn enforce_cell_invariants_on_cell(
        &self,
        id: Guid,
    ) -> Result<(), CellInvariantsEnforcerError>;
}
