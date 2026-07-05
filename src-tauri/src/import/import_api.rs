use std::time::Duration;

use base64::{Engine as _, engine::general_purpose};
use tauri_plugin_http::reqwest::{
    self,
    header::{CONTENT_TYPE, REFERER},
};

use crate::common::api_error::ApiError;

use super::dto::{FetchedImageDto, FetchedPageDto};

const MAX_PAGE_BYTES: usize = 20 * 1024 * 1024;
const MAX_IMAGE_BYTES: usize = 10 * 1024 * 1024;
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

#[tauri::command]
pub async fn fetch_page(url: String) -> Result<FetchedPageDto, ApiError> {
    let client = build_client(Duration::from_secs(20))?;
    let response = client.get(&url).send().await?;

    let final_url = response.url().to_string();
    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let bytes = read_capped(response, MAX_PAGE_BYTES).await?;

    if content_type.contains("pdf") || bytes.starts_with(b"%PDF-") {
        return Ok(FetchedPageDto::Pdf {
            final_url,
            bytes_base64: general_purpose::STANDARD.encode(&bytes),
        });
    }

    if content_type.contains("html") || content_type.is_empty() {
        return Ok(FetchedPageDto::Html {
            final_url,
            text: String::from_utf8_lossy(&bytes).into_owned(),
        });
    }

    Ok(FetchedPageDto::Other {
        final_url,
        content_type,
    })
}

#[tauri::command]
pub async fn fetch_image(
    url: String,
    referer: Option<String>,
) -> Result<FetchedImageDto, ApiError> {
    let client = build_client(Duration::from_secs(10))?;
    let mut request = client.get(&url);
    if let Some(referer) = referer {
        request = request.header(REFERER, referer);
    }
    let response = request.send().await?;

    let declared_mime = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .split(';')
        .next()
        .unwrap_or("application/octet-stream")
        .to_string();

    let bytes = read_capped(response, MAX_IMAGE_BYTES).await?;
    let mime = sniff_image_mime(&bytes).unwrap_or(declared_mime);

    Ok(FetchedImageDto {
        mime,
        bytes_base64: general_purpose::STANDARD.encode(&bytes),
    })
}

fn build_client(timeout: Duration) -> Result<reqwest::Client, ApiError> {
    reqwest::Client::builder()
        .timeout(timeout)
        .redirect(reqwest::redirect::Policy::limited(10))
        .user_agent(USER_AGENT)
        .build()
        .map_err(|e| ApiError::new(e.to_string()))
}

async fn read_capped(response: reqwest::Response, cap: usize) -> Result<Vec<u8>, ApiError> {
    let bytes = response.bytes().await?;
    if bytes.len() > cap {
        return Err(ApiError::new("The response was too large.".to_string()));
    }
    Ok(bytes.to_vec())
}

fn sniff_image_mime(bytes: &[u8]) -> Option<String> {
    if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        Some("image/png".to_string())
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("image/jpeg".to_string())
    } else if bytes.starts_with(b"GIF8") {
        Some("image/gif".to_string())
    } else if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        Some("image/webp".to_string())
    } else {
        None
    }
}
