use async_trait::async_trait;
use thiserror::Error;

use crate::{
    backend::{
        backend_dto::UserInformationDto, clients::brainy_backend_client::BrainyBackendClientError,
        dto::sign_up_request_dto::SignUpRequestDto,
    },
    settings::services::settings_updater::SettingsUpdaterError,
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum AuthenticatorError {
    #[error(transparent)]
    BrainyBackendClient(#[from] BrainyBackendClientError),
    #[error(transparent)]
    SettingsUpdater(#[from] SettingsUpdaterError),
}

#[async_trait]
pub trait Authenticator: Send + Sync {
    async fn sign_in(
        &self,
        username: String,
        password: String,
    ) -> Result<UserInformationDto, AuthenticatorError>;

    async fn sign_out(&self) -> Result<(), AuthenticatorError>;

    async fn sign_up(
        &self,
        request: SignUpRequestDto,
    ) -> Result<UserInformationDto, AuthenticatorError>;
}
