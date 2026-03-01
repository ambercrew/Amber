use std::error::Error;

use serde::Serialize;

#[derive(Serialize)]
pub struct ApiError(String);

impl ApiError {
    pub fn new(err: String) -> Self {
        Self(err)
    }
}

impl<T> From<T> for ApiError
where
    T: Error,
{
    fn from(value: T) -> Self {
        log::error!("An error occurred: {:#?}", value);

        let mut source = value.source();
        while let Some(cause) = source {
            log::error!("Caused by: {}", cause);
            source = cause.source();
        }

        ApiError(value.to_string())
    }
}
