use serde::{Deserialize, Serialize};

use crate::Guid;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProblemDetails {
    pub detail: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignInDto {
    pub username: String,
    pub password: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserInformnationDto {
    pub id: Guid,
    pub username: String,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignUpDto {
    pub username: String,
    pub password: String,
    pub email: String,
    pub first_name: String,
    pub last_name: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserInformationDto {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
}
