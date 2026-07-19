use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum FetchedPageDto {
    Html {
        final_url: String,
        text: String,
    },
    Pdf {
        final_url: String,
        bytes_base64: String,
    },
    Other {
        final_url: String,
        content_type: String,
    },
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchedImageDto {
    pub mime: String,
    pub bytes_base64: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfExtractionDto {
    pub title: Option<String>,
    pub html: String,
    pub page_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfImportProgressEvent {
    pub request_id: String,
    pub done: usize,
    pub total: usize,
}
