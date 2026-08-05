use std::sync::Arc;

use async_trait::async_trait;
use injector::injector_scope::{InjectorScope, ScopeInjectable};
use serde::Serialize;

use crate::common::request_bridge::{RequestBridge, RequestBridgeError};
use crate::common::services::lexical_json_converter::{
    LexicalJsonConverter, LexicalJsonConverterError,
};

const CONVERT_MARKDOWN_TO_LEXICAL_EVENT: &str = "convert-markdown-to-lexical";

#[derive(Serialize, Clone)]
struct ConvertMarkdownToLexicalPayload {
    markdown: String,
}

pub struct TauriLexicalJsonConverter<R: tauri::Runtime> {
    app_handle: Arc<tauri::AppHandle<R>>,
    bridge: Arc<RequestBridge>,
}

#[async_trait]
impl<R: tauri::Runtime> ScopeInjectable for TauriLexicalJsonConverter<R> {
    async fn from_injector_scope(scope: &InjectorScope<'_>) -> Self {
        let app_handle = scope.resolve::<tauri::AppHandle<R>>().await;
        let bridge = scope.resolve::<RequestBridge>().await;
        Self { app_handle, bridge }
    }
}

#[async_trait]
impl<R: tauri::Runtime> LexicalJsonConverter for TauriLexicalJsonConverter<R> {
    async fn convert_markdown(&self, markdown: &str) -> Result<String, LexicalJsonConverterError> {
        self.bridge
            .request(
                &self.app_handle,
                CONVERT_MARKDOWN_TO_LEXICAL_EVENT,
                ConvertMarkdownToLexicalPayload {
                    markdown: markdown.to_string(),
                },
            )
            .await
            .map_err(|err| match err {
                RequestBridgeError::Emit => LexicalJsonConverterError::Emit,
                RequestBridgeError::Timeout => LexicalJsonConverterError::Timeout,
            })
    }
}
