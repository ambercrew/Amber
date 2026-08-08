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
        let mut msg = format!("{value}");
        let mut source = value.source();
        while let Some(cause) = source {
            msg.push_str(&format!("\n  caused by: {cause}"));
            source = cause.source();
        }
        log::error!("{msg}");

        ApiError(value.to_string())
    }
}
