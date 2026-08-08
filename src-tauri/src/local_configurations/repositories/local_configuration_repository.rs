use async_trait::async_trait;

use crate::{
    common::repository_error::RepositoryError,
    local_configurations::entities::local_configuration::LocalConfiguration,
};

#[async_trait]
pub trait LocalConfigurationRepository: Send + Sync {
    async fn get_by_name(&self, name: &str) -> Result<Option<LocalConfiguration>, RepositoryError>;
    async fn upsert(&self, configuration: &LocalConfiguration) -> Result<(), RepositoryError>;
}
