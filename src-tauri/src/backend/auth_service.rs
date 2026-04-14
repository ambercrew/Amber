use std::sync::Arc;

use injector_derive::ScopeInjectable;
use thiserror::Error;

use crate::{
    backend::{
        clients::brainy_backend_client::{BrainyBackendClient, BrainyBackendClientError},
        dto::sign_up_request::SignUpRequest,
        models::UserInformationDto,
    },
    settings::{
        dto::update_settings_request::UpdateSettingsRequest,
        settings_service::{SettingsService, SettingsServiceError},
        value_objects::settings_profile::SettingsProfile,
    },
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum AuthServiceError {
    #[error(transparent)]
    BrainyBackendClient(#[from] BrainyBackendClientError),
    #[error(transparent)]
    SettingsService(#[from] SettingsServiceError),
}

#[derive(ScopeInjectable)]
pub struct AuthService {
    backend_client: Arc<dyn BrainyBackendClient>,
    settings_service: Arc<SettingsService>,
}

impl AuthService {
    pub async fn sign_in(
        &self,
        username: String,
        password: String,
    ) -> Result<UserInformationDto, AuthServiceError> {
        let user_information = self.backend_client.sign_in(username, password).await?;
        self.settings_service
            .update_settings(UpdateSettingsRequest {
                profile: Some(SettingsProfile::User(user_information.username.clone())),
                ..Default::default()
            })
            .await?;
        Ok(user_information)
    }

    pub async fn sign_out(&self) -> Result<(), AuthServiceError> {
        self.backend_client.sign_out().await?;
        self.settings_service
            .update_settings(UpdateSettingsRequest {
                profile: Some(SettingsProfile::Default),
                ..Default::default()
            })
            .await?;
        Ok(())
    }

    pub async fn sign_up(
        &self,
        request: SignUpRequest,
    ) -> Result<UserInformationDto, AuthServiceError> {
        let user_information = self.backend_client.sign_up(request).await?;
        self.settings_service
            .set_profile_for_new_user(user_information.username.clone())
            .await?;
        Ok(user_information)
    }
}
