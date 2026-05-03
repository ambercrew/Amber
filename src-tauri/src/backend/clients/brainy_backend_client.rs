use crate::backend::{backend_dto::SyncEntityDto, dto::sign_up_request_dto::SignUpRequestDto};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
#[cfg(test)]
use mockall::automock;
use thiserror::Error;

use crate::SourceError;
use crate::backend::backend_dto::{SyncedEntitiesPageDto, UpdatePasswordDto, UserInformationDto};

#[derive(Error, Debug)]
pub enum BrainyBackendClientError {
    #[error("Invalid credentials!")]
    InvalidCredentials,
    #[error("Unauthorized!")]
    Unauthorized,
    #[error("The application received an unexpected response!")]
    UnexpectedResponse,
    #[error("An unknown error occurred while sending the request")]
    Unknown(#[source] SourceError),
    #[error("Failed to deserialize the response")]
    Deserialization(#[source] SourceError),
    #[error("{0}")]
    BadRequest(String),
    #[error("Failed to connect to the server, please try again!")]
    Connect,
    #[error("The request timed out, please try again!")]
    Timeout,
    #[error("Cannot save authentication cookies")]
    CannotSaveAuthenticationCookies(#[source] SourceError),
    #[error("Cannot load stored cookies")]
    CannotLoadStoredCookies,
}

impl PartialEq for BrainyBackendClientError {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::BadRequest(a), Self::BadRequest(b)) => a == b,
            _ => std::mem::discriminant(self) == std::mem::discriminant(other),
        }
    }
}

impl Eq for BrainyBackendClientError {}

#[cfg_attr(test, automock)]
#[async_trait]
pub trait BrainyBackendClient: Send + Sync {
    async fn sign_in(
        &self,
        username: String,
        password: String,
    ) -> Result<UserInformationDto, BrainyBackendClientError>;

    async fn sign_up(
        &self,
        request: SignUpRequestDto,
    ) -> Result<UserInformationDto, BrainyBackendClientError>;

    async fn sign_out(&self) -> Result<(), BrainyBackendClientError>;

    async fn verify_user_email(
        &self,
        verification_code: String,
    ) -> Result<(), BrainyBackendClientError>;

    async fn resend_email_verification_code(&self) -> Result<(), BrainyBackendClientError>;

    async fn get_user_information(&self) -> Result<UserInformationDto, BrainyBackendClientError>;

    fn is_signed_in(&self) -> Result<bool, BrainyBackendClientError>;

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

    async fn delete_user(&self) -> Result<(), BrainyBackendClientError>;

    async fn update_password(&self, dto: UpdatePasswordDto)
    -> Result<(), BrainyBackendClientError>;
}
