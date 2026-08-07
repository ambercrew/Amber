use async_trait::async_trait;
#[cfg(test)]
use mockall::automock;
use serde_json::Value;

/// Lets services queue up frontend-bound events during a request scope,
/// deduplicating identical ones, without emitting them until persistence has
/// actually succeeded.
#[async_trait]
#[cfg_attr(test, automock)]
pub trait EventManager: Send + Sync {
    async fn push(&self, name: &str, body: Value);
    async fn emit_all(&self);
}
