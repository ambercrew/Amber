use async_trait::async_trait;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum LexicalJsonConverterError {
    #[error("Failed to notify the frontend of the pending conversion")]
    Emit,
    #[error("The frontend did not respond to the conversion request in time")]
    Timeout,
}

/// Converts Markdown into serialized Lexical editor state JSON, the format
/// used for `Reading`/`Extract`/`Card` content. The backend has no Lexical
/// schema implementation of its own, so this delegates to the frontend's
/// headless Lexical editor (via its Markdown-to-HTML-to-Lexical pipeline)
/// through a request/response round trip over Tauri events.
#[async_trait]
pub trait LexicalJsonConverter: Send + Sync {
    async fn convert_markdown(&self, markdown: &str) -> Result<String, LexicalJsonConverterError>;
}
