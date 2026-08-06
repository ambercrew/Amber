use async_trait::async_trait;
#[cfg(test)]
use mockall::automock;
use serde_json::Value;

#[derive(Debug, Clone, PartialEq)]
pub struct AppEvent {
    pub name: String,
    pub body: Value,
}

/// Lets services queue up frontend-bound events during a request scope,
/// deduplicating identical ones, without emitting them until persistence has
/// actually succeeded. `UnitOfWorkExt::save_changes` drains and emits them
/// once the transaction commits.
#[async_trait]
#[cfg_attr(test, automock)]
pub trait EventManager: Send + Sync {
    async fn push(&self, name: &str, body: Value);
    async fn emit_all(&self);
}
