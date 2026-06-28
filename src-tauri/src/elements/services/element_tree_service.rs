use async_trait::async_trait;

use crate::common::repository_error::RepositoryError;
use crate::elements::dto::tree_dto::NodeDto;

#[async_trait]
pub trait ElementTreeService: Send + Sync {
    async fn get_element_tree(&self) -> Result<Vec<NodeDto>, RepositoryError>;
}
