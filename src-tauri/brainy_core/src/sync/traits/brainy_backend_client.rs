use async_trait::async_trait;
use thiserror::Error;

use crate::sync::models::UserInformnationDto;

#[derive(Error, Debug, PartialEq, Eq)]
pub enum BrainyBackendClientError {
    #[error("Invalid credentials!")]
    InvalidCredentials,
    #[error("The application received an unexpected respone!")]
    UnexpectedResponse,
    #[error("An unknown error happend while sending the request!")]
    UnknownError(String),
    #[error("Error deserializing the response received.")]
    DeserializationError(String),
    #[error("{0}")]
    BadRequest(String),
}

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

    async fn get_user_information(&self) -> Result<UserInformnationDto, BrainyBackendClientError>;

    fn is_signed_in(&self) -> bool;

    async fn update_user_information(
        &self,
        first_name: Option<String>,
        last_name: Option<String>,
    ) -> Result<(), BrainyBackendClientError>;
}
