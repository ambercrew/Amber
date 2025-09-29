use std::{
    io::{BufReader, Cursor},
    sync::Arc,
};

use crate::sync::{
    models::{LoginDto, UserInformnationDto, UserRegistrationDto},
    traits::brainy_backend_client::{BrainyBackendClient, BrainyBackendClientError},
};
use async_trait::async_trait;
use keyring::Entry;
use reqwest::{Response, StatusCode, Url};
use reqwest_cookie_store::CookieStoreMutex;

pub struct BrainyBackendHttpClient {
    backend_url: Url,
    reqwest_client: reqwest::Client,
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

        Ok(Self {
            backend_url,
            reqwest_client: reqwest_client.unwrap(),
            cookie_store,
            keyring_entry,
        })
    }
}

#[async_trait]
impl BrainyBackendClient for BrainyBackendHttpClient {
    async fn login(
        &self,
        username: String,
        password: String,
    ) -> Result<(), BrainyBackendClientError> {
        let dto = LoginDto { username, password };

        log::info!("Logging in...");
        let response = self
            .reqwest_client
            .post(self.backend_url.join("/api/auth/login").unwrap())
            .json(&dto)
            .send()
            .await;

        ensure_success_response(response)?;
        self.persist_cookies();
        Ok(())
    }

    async fn signup(
        &self,
        username: String,
        password: String,
        email: String,
        first_name: String,
        last_name: String
    ) -> Result<(), BrainyBackendClientError> {
        let dto = UserRegistrationDto { first_name, last_name, email, password, username };

        log::info!("Signing up...");
        let response = self
            .reqwest_client
            .post(self.backend_url.join("/api/auth/signup").unwrap())
            .json(&dto)
            .send()
            .await;

        ensure_success_response(response)?;
        self.persist_cookies();

        Ok(())
    }

    async fn get_user_information(&self) -> Result<UserInformnationDto, BrainyBackendClientError> {
        let response = self
            .reqwest_client
            .get(self.backend_url.join("/api/user").unwrap())
            .send()
            .await;

        let response = ensure_success_response(response)?;
        // TODO: error handling, and convert to common code
        let result = response.json::<UserInformnationDto>().await.unwrap();
        Ok(result)
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
fn ensure_success_response(
    response: Result<Response, reqwest::Error>,
) -> Result<Response, BrainyBackendClientError> {
    if let Err(err) = response {
        return Err(BrainyBackendClientError::UnknownError(err.to_string()));
    }

    let response = response.unwrap();

    #[cfg(debug_assertions)]
    log::info!("Response Status {}", response.status());

    #[cfg(debug_assertions)]
    log::info!("{response:#?}");

    match response.status() {
        StatusCode::UNAUTHORIZED => Err(BrainyBackendClientError::InvalidCredentials),
        StatusCode::OK => Ok(response),
        _ => Err(BrainyBackendClientError::UnexpectedResponse),
    }
}
