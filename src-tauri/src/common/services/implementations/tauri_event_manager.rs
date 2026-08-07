use std::sync::Arc;

use async_trait::async_trait;
use injector::injector_scope::{InjectorScope, ScopeInjectable};
use serde_json::Value;
use tauri::Emitter;
use tokio::sync::Mutex;

use crate::common::event_manager::EventManager;

#[derive(Debug, Clone, PartialEq)]
struct AppEvent {
    name: String,
    body: Value,
}

pub struct TauriEventManager<R: tauri::Runtime> {
    app_handle: Arc<tauri::AppHandle<R>>,
    events: Mutex<Vec<AppEvent>>,
}

#[async_trait]
impl<R: tauri::Runtime> ScopeInjectable for TauriEventManager<R> {
    async fn from_injector_scope(scope: &InjectorScope<'_>) -> Self {
        let app_handle = scope.resolve::<tauri::AppHandle<R>>().await;
        Self {
            app_handle,
            events: Mutex::new(Vec::new()),
        }
    }
}

#[async_trait]
impl<R: tauri::Runtime> EventManager for TauriEventManager<R> {
    async fn push(&self, name: &str, body: Value) {
        let mut events = self.events.lock().await;
        let event = AppEvent {
            name: name.to_string(),
            body,
        };
        if !events.contains(&event) {
            events.push(event);
        }
    }

    async fn emit_all(&self) {
        let events = self.events.lock().await.drain(..).collect::<Vec<_>>();
        for event in events {
            if let Err(err) = self.app_handle.emit(&event.name, event.body) {
                log::error!("Failed to emit event '{}': {}", event.name, err);
            }
        }
    }
}
