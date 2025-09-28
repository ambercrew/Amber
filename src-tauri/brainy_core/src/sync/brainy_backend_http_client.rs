use async_trait::async_trait;
use reqwest::Url;
use crate::sync::traits::brainy_backend_client::{BrainyBackendClient, BrainyBackendClientError};


pub struct BrainyBackendHttpClient {
    backend_url: Url,
    reqwest_client: reqwest::Client,
}

impl BrainyBackendHttpClient {
    pub fn new(backend_url: Url) -> Self {
        // TODO: error handling
        let reqwest_client = reqwest::Client::builder().build().unwrap();
        Self { backend_url, reqwest_client }
    }
}

#[async_trait]
impl BrainyBackendClient for BrainyBackendHttpClient {
    async fn login(&self, username: &str, password: &str) -> Result<(), BrainyBackendClientError> {
        // TODO: error handling
        // TODO: add body
        self.reqwest_client.post(self.backend_url.join("/api/auth/login").unwrap())
            .send()
            .await
            .unwrap();
        todo!()
    }
}

mod models {
    pub struct LoginDto {

    }
}
