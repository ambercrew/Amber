use async_trait::async_trait;
use thiserror::Error;

#[derive(Error, Debug, PartialEq, Eq)]
pub enum BrainyBackendClientError {

}

#[async_trait]
pub trait BrainyBackendClient: Send + Sync {
    async fn login(&self, username: &str, password: &str) -> Result<(), BrainyBackendClientError>;
}
