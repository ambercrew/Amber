use crate::backend::models::SyncEntityDto;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
#[cfg(test)]
use mockall::automock;
use thiserror::Error;

use crate::backend::models::{SyncedEntitiesPageDto, UserInformationDto};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum BrainyBackendClientError {
    #[error("Invalid credentials!")]
    InvalidCredentials,
    #[error("Unauthorized!")]
    Unauthorized,
    #[error("The application received an unexpected respone!")]
    UnexpectedResponse,
    #[error("An unknown error happend while sending the request!")]
    UnknownError(String),
    #[error("Error deserializing the response received.")]
    DeserializationError(String),
    #[error("{0}")]
    BadRequest(String),
    #[error("Error connecting to the server, please try again!")]
    ConnectError,
    #[error("The request has timed out, please try again!")]
    TimeoutError,
}

#[cfg_attr(test, automock)]
#[async_trait]
pub trait BrainyBackendClient: Send + Sync {
    async fn log_in(
        &self,
        username: String,
        password: String,
    ) -> Result<(), BrainyBackendClientError>;

    async fn sign_up(
        &self,
        username: String,
        password: String,
        email: String,
        first_name: String,
        last_name: String,
    ) -> Result<(), BrainyBackendClientError>;

    async fn sign_out(&self) -> Result<(), BrainyBackendClientError>;

    async fn get_user_information(&self) -> Result<UserInformationDto, BrainyBackendClientError>;

    fn is_signed_in(&self) -> bool;

    async fn update_user_information(
        &self,
        first_name: Option<String>,
        last_name: Option<String>,
    ) -> Result<(), BrainyBackendClientError>;

    async fn get_synced_entities_after_ordered_by_created_date(
        &self,
        date: DateTime<Utc>,
        page: u32,
    ) -> Result<SyncedEntitiesPageDto, BrainyBackendClientError>;

    async fn send_synced_entities(
        &self,
        entities: &[SyncEntityDto],
    ) -> Result<(), BrainyBackendClientError>;
}
