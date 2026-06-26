use async_trait::async_trait;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::card::Card;

#[async_trait]
pub trait CardRepository: Send + Sync {
    async fn get_all(&self) -> Result<Vec<Card>, RepositoryError>;
}
