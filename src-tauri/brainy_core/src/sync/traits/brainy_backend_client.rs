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
}

#[async_trait]
pub trait BrainyBackendClient: Send + Sync {
    async fn login(
        &self,
        username: String,
        password: String,
    ) -> Result<(), BrainyBackendClientError>;

    async fn get_user_information(&self) -> Result<UserInformnationDto, BrainyBackendClientError>;
}
