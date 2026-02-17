use std::sync::Arc;

use crate::{
    Guid,
    ai_integration::{
        ai_service::{AiService, StreamLlmResponseEvent},
        ai_state::AiState,
        entities::{chat::Chat, message::Message},
    },
    common::{api_error::ApiError, traits::repositories_context::RepositoriesContext},
};
use tauri::{State, ipc::Channel};
use tokio::sync::Mutex;

#[tauri::command]
pub async fn stream_ai_response(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    ai_service: State<'_, Arc<AiService>>,
    on_event: Channel<StreamLlmResponseEvent>,
    prompt: String,
    chat_id: Option<Guid>,
) -> Result<(), ApiError> {
    let result = ai_service
        .stream(prompt, chat_id, |event| match on_event.send(event) {
            Ok(_) => Ok(()),
            Err(err) => Err(err.to_string()),
        })
        .await;
    let context = context.lock().await;
    context.save_changes().await?;

    match result {
        Ok(()) => Ok(()),
        Err(err) => Err(ApiError::new(err.to_string())),
    }
}

#[tauri::command]
pub async fn stop_ai_generation(ai_state: State<'_, Arc<AiState>>) -> Result<(), ApiError> {
    ai_state.cancel_generation();
    Ok(())
}

#[tauri::command]
pub async fn get_all_ai_chats_sorted_by_date_desc(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
) -> Result<Vec<Chat>, ApiError> {
    let context = context.lock().await;
    let chats = context
        .ai_repository()
        .get_all_chats_sorted_by_date_desc()
        .await?;
    Ok(chats)
}

#[tauri::command]
pub async fn delete_ai_chat(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    id: Guid,
) -> Result<(), ApiError> {
    let context = context.lock().await;
    context.ai_repository().delete_chat(id).await?;
    context.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn get_chat_messages_ordered(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    id: Guid,
) -> Result<Vec<Message>, ApiError> {
    let context = context.lock().await;
    let messages = context
        .ai_repository()
        .get_chat_messages_ordered(id)
        .await?;
    Ok(messages)
}

#[tauri::command]
pub async fn rename_ai_chat(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    id: Guid,
    new_title: String,
) -> Result<(), ApiError> {
    let context = context.lock().await;
    let mut chat = context.ai_repository().get_chat_by_id(id).await?;
    chat.set_title(new_title);
    context.ai_repository().upsert_chat(&chat).await?;
    Ok(())
}
