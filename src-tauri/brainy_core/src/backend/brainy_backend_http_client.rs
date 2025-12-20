use std::{
    io::{BufReader, Cursor},
    sync::Arc,
};

use crate::backend::{
    models::{
        ProblemDetails, SignInDto, SignUpDto, SyncEntityDto, SyncedEntitiesPageDto,
        UpdateUserInformationDto, UserInformnationDto,
    },
    traits::brainy_backend_client::{BrainyBackendClient, BrainyBackendClientError},
};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use keyring::Entry;
use reqwest::{Response, StatusCode, Url};
use reqwest_cookie_store::CookieStoreMutex;
use reqwest_middleware::{ClientBuilder, ClientWithMiddleware};
use reqwest_retry::{RetryTransientMiddleware, policies::ExponentialBackoff};

pub struct BrainyBackendHttpClient {
    backend_url: Url,
    reqwest_client: ClientWithMiddleware,
    cookie_store: Arc<CookieStoreMutex>,
    keyring_entry: Option<Entry>,
}

impl BrainyBackendHttpClient {
    pub fn new(backend_url: Url) -> Result<Self, String> {
        let mut cookie_store = reqwest_cookie_store::CookieStore::new();

        let mut keyring_entry = None;
        if let Ok(entry) = Entry::new("brainy", "backend-cookies") {
            keyring_entry = Some(entry);
            if let Ok(cookies) = keyring_entry.as_ref().unwrap().get_password() {
                let cursor = Cursor::new(cookies);
                let reader = BufReader::new(cursor);
                if let Ok(result) = cookie_store::serde::json::load(reader) {
                    cookie_store = result;
                }
            }
        } else {
            log::info!("The application was not able to access the keyring.")
        }

        let cookie_store = reqwest_cookie_store::CookieStoreMutex::new(cookie_store);
        let cookie_store = std::sync::Arc::new(cookie_store);

        let reqwest_client = reqwest::Client::builder()
            .cookie_provider(cookie_store.clone())
            .build();

        if let Err(err) = reqwest_client {
            return Err(err.to_string());
        }

        #[cfg(debug_assertions)]
        log::info!(
            "Loaded the following cookies from keyring entry: {:#?}",
            cookie_store.lock().unwrap()
        );

        let retry_policy = ExponentialBackoff::builder().build_with_max_retries(3);

        let client_with_middleware = ClientBuilder::new(reqwest_client.unwrap())
            .with(RetryTransientMiddleware::new_with_policy(retry_policy))
            .build();

        Ok(Self {
            backend_url,
            reqwest_client: client_with_middleware,
            cookie_store,
            keyring_entry,
        })
    }
}

#[async_trait]
impl BrainyBackendClient for BrainyBackendHttpClient {
    async fn log_in(
        &self,
        username: String,
        password: String,
    ) -> Result<(), BrainyBackendClientError> {
        let dto = SignInDto { username, password };

        log::info!("Signing-in...");
        let response = self
            .reqwest_client
            .post(self.backend_url.join("/api/v1/auth/sign-in").unwrap())
            .json(&dto)
            .send()
            .await;

        let status = ensure_success_response(response).await;

        if let Err(ref err) = status
            && err == &BrainyBackendClientError::Unauthorized
        {
            return Err(BrainyBackendClientError::InvalidCredentials);
        }
        status?;

        self.persist_cookies();
        Ok(())
    }

    async fn sign_up(
        &self,
        username: String,
        password: String,
        email: String,
        first_name: String,
        last_name: String,
    ) -> Result<(), BrainyBackendClientError> {
        let dto = SignUpDto {
            first_name,
            last_name,
            email,
            password,
            username,
        };

        log::info!("Signing-up...");
        let response = self
            .reqwest_client
            .post(self.backend_url.join("/api/v1/auth/sign-up").unwrap())
            .json(&dto)
            .send()
            .await;

        ensure_success_response(response).await?;
        self.persist_cookies();

        Ok(())
    }

    async fn sign_out(&self) -> Result<(), BrainyBackendClientError> {
        log::info!("Signing-out...");
        let response = self
            .reqwest_client
            .post(self.backend_url.join("/api/v1/auth/sign-out").unwrap())
            .send()
            .await;
        ensure_success_response(response).await?;
        self.persist_cookies();
        Ok(())
    }

    async fn get_user_information(&self) -> Result<UserInformnationDto, BrainyBackendClientError> {
        let response = self
            .reqwest_client
            .get(self.backend_url.join("/api/v1/user").unwrap())
            .send()
            .await;

        let response = ensure_success_response(response).await?;
        match response.json::<UserInformnationDto>().await {
            Ok(result) => Ok(result),
            Err(_) => Err(BrainyBackendClientError::UnexpectedResponse),
        }
    }

    fn is_signed_in(&self) -> bool {
        let store = self.cookie_store.lock().unwrap();

        for cookie in store.iter_unexpired() {
            if cookie.name() == ".AspNetCore.Cookies" {
                return true;
            }
        }

        false
    }

    async fn update_user_information(
        &self,
        first_name: Option<String>,
        last_name: Option<String>,
    ) -> Result<(), BrainyBackendClientError> {
        let dto = UpdateUserInformationDto {
            first_name,
            last_name,
        };

        log::info!("Updating user information...");
        let response = self
            .reqwest_client
            .patch(self.backend_url.join("/api/v1/user").unwrap())
            .json(&dto)
            .send()
            .await;

        ensure_success_response(response).await?;

        Ok(())
    }

    async fn get_synced_entities_after_ordered_by_created_date(
        &self,
        date: DateTime<Utc>,
        page: u32,
    ) -> Result<SyncedEntitiesPageDto, BrainyBackendClientError> {
        log::info!("Getting synced entity after {date} and for the page {page}...");

        let response = self
            .reqwest_client
            .get(self.backend_url.join("/api/v1/sync").unwrap())
            .query(&[("date", date.to_rfc3339())])
            .query(&[("page", page)])
            .send()
            .await;

        let response = ensure_success_response(response).await?;
        match response.json::<SyncedEntitiesPageDto>().await {
            Ok(result) => Ok(result),
            Err(_) => Err(BrainyBackendClientError::UnexpectedResponse),
        }
    }

    async fn send_synced_entities(
        &self,
        entities: &[SyncEntityDto],
    ) -> Result<(), BrainyBackendClientError> {
        log::info!(
            "Sending synced entities, a total of {} entities",
            entities.len()
        );

        let response = self
            .reqwest_client
            .post(self.backend_url.join("/api/v1/sync").unwrap())
            .json(&entities)
            .send()
            .await;

        ensure_success_response(response).await?;

        Ok(())
    }
}

impl BrainyBackendHttpClient {
    fn persist_cookies(&self) {
        let mut writer = std::io::BufWriter::new(Vec::new());
        let store = self.cookie_store.lock().unwrap();
        cookie_store::serde::json::save(&store, &mut writer).unwrap();
        let cookies_json = String::from_utf8(writer.into_inner().unwrap()).unwrap();

        if let Some(keyring_entry) = self.keyring_entry.as_ref() {
            #[cfg(debug_assertions)]
            log::info!("Saving the following cookies to keyring: {cookies_json}");
            keyring_entry.set_password(&cookies_json).unwrap();
        }
    }
}

/// Ensures that there was no error sending the response and that
/// the status code of the response is 200, otherwise convert to an
/// appropriate error.
/// On 400 response it tries to parse the problem details and return it in a
/// an appropriate error.
async fn ensure_success_response(
    response: Result<Response, reqwest_middleware::Error>,
) -> Result<Response, BrainyBackendClientError> {
    if let Err(err) = response {
        if err.is_connect() {
            return Err(BrainyBackendClientError::ConnectError);
        } else if err.is_timeout() {
            return Err(BrainyBackendClientError::TimeoutError);
        } else {
            return Err(BrainyBackendClientError::UnknownError(err.to_string()));
        }
    }

    let response = response.unwrap();

    #[cfg(debug_assertions)]
    log::info!("Response Status {}", response.status());

    #[cfg(debug_assertions)]
    log::info!("{response:#?}");

    match response.status() {
        StatusCode::UNAUTHORIZED => Err(BrainyBackendClientError::Unauthorized),
        StatusCode::OK => Ok(response),
        StatusCode::BAD_REQUEST => {
            if let Ok(problem_details) = response.json::<ProblemDetails>().await {
                Err(BrainyBackendClientError::BadRequest(problem_details.detail))
            } else {
                Err(BrainyBackendClientError::UnexpectedResponse)
            }
        }
        _ => Err(BrainyBackendClientError::UnexpectedResponse),
    }
}
