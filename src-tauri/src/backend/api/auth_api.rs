use std::sync::Arc;

use crate::{
    backend::{
        backend_dto::{UpdatePasswordDto, UserInformationDto},
        clients::brainy_backend_client::BrainyBackendClient,
        dto::sign_up_request_dto::SignUpRequestDto,
        services::authenticator::Authenticator,
    },
    common::api_error::ApiError,
};
use injector::injector::Injector;
use tauri::State;

#[tauri::command]
pub async fn sign_in(
    injector: State<'_, Arc<Injector>>,
    username: String,
    password: String,
) -> Result<UserInformationDto, ApiError> {
    let scope = injector.start_scope();
    let dto = scope
        .resolve::<dyn Authenticator>()
        .await
        .sign_in(username, password)
        .await?;
    Ok(dto)
}

#[tauri::command]
pub async fn sign_up(
    injector: State<'_, Arc<Injector>>,
    request: SignUpRequestDto,
) -> Result<UserInformationDto, ApiError> {
    let scope = injector.start_scope();
    let dto = scope
        .resolve::<dyn Authenticator>()
        .await
        .sign_up(request)
        .await?;
    Ok(dto)
}

#[tauri::command]
pub async fn sign_out(injector: State<'_, Arc<Injector>>) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn Authenticator>()
        .await
        .sign_out()
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn is_signed_in(injector: State<'_, Arc<Injector>>) -> Result<bool, ApiError> {
    let scope = injector.start_scope();
    Ok(scope
        .resolve::<dyn BrainyBackendClient>()
        .await
        .is_signed_in()?)
}

#[tauri::command]
pub async fn verify_user_email(
    injector: State<'_, Arc<Injector>>,
    verification_code: String,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn BrainyBackendClient>()
        .await
        .verify_user_email(verification_code)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn resend_email_verification_code(
    injector: State<'_, Arc<Injector>>,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn BrainyBackendClient>()
        .await
        .resend_email_verification_code()
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn update_password(
    injector: State<'_, Arc<Injector>>,
    old_password: String,
    new_password: String,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn BrainyBackendClient>()
        .await
        .update_password(UpdatePasswordDto {
            old_password,
            new_password,
        })
        .await?;
    Ok(())
}
