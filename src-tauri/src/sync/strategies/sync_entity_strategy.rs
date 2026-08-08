use async_trait::async_trait;
use chrono::{DateTime, Utc};
use thiserror::Error;
use uuid::Uuid;

use crate::{
    backend::backend_dto::SyncEntityDto, common::repository_error::RepositoryError,
    sync::entities::synced_entity::SyncedEntity,
};

#[derive(Error, Debug)]
pub enum SyncEntityStrategyError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait SyncEntityStrategy: Send + Sync {
    type Input: Send;
    type Entity: Send;

    fn parse(
        &self,
        synced_entity: &SyncedEntity,
        input: Self::Input,
    ) -> ParseSyncedEntityOutput<Self::Entity>;

    async fn upsert(&self, entity: Self::Entity) -> Result<u64, SyncEntityStrategyError>;

    async fn get_sync_dtos_modified_since(
        &self,
        since: DateTime<Utc>,
    ) -> Result<Vec<SyncEntityDto>, SyncEntityStrategyError>;
}

pub struct ParseSyncedEntityOutput<T> {
    pub entity: T,
    pub references: Vec<ParseSyncedEntityReference<T>>,
}

pub struct ParseSyncedEntityReference<T> {
    pub id: Uuid,
    pub repair: Option<RepairRemovedReferenceFn<T>>,
}

pub type RepairRemovedReferenceFn<T> = Box<dyn Fn(&mut T) + Send>;
