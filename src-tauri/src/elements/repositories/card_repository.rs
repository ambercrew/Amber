use async_trait::async_trait;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::card::Card;
use crate::elements::repositories::element_repository::ElementRepository;

#[async_trait]
pub trait CardRepository: ElementRepository + Send + Sync {
    async fn get_all(&self) -> Result<Vec<Card>, RepositoryError>;
    async fn create(&self, card: Card) -> Result<(), RepositoryError>;
}
