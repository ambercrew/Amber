use std::sync::Arc;

use crate::{
    Guid,
    ai_integration::{
        ai_service::{AiService, StreamLlmResponseEvent},
        ai_state::AiState,
        entities::{
            chat::Chat,
            message::{Message, MessageContent, ToolCallStatus},
        },
        repositories::traits::ai_repository::AiRepository,
        stream_ai_request::StreamAiRequest,
    },
    common::{api_error::ApiError, unit_of_work_ext::UnitOfWorkExt},
};
use injector::injector::Injector;
use tauri::{State, ipc::Channel};

#[tauri::command]
pub async fn stream_ai_response(
    injector: State<'_, Arc<Injector>>,
    on_event: Channel<StreamLlmResponseEvent>,
    request: StreamAiRequest,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();

    let result = scope
        .resolve::<AiService>()
        .await
        .stream(
            request,
            Arc::new(move |event| match on_event.send(event) {
                Ok(_) => Ok(()),
                Err(err) => Err(err.to_string()),
            }),
        )
        .await;

    scope.save_changes().await?;

    match result {
        Ok(()) => Ok(()),
        Err(err) => Err(ApiError::new(err.to_string())),
    }
}

#[tauri::command]
pub async fn reject_tool_call(
    injector: State<'_, Arc<Injector>>,
    message_id: Guid,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let ai_repository = scope.resolve::<dyn AiRepository>().await;

    let mut message = ai_repository.get_message_by_id(message_id).await?;

    if let MessageContent::ToolCall(tool_call) = message.content_mut() {
        log::info!("Reject message with id {message_id}");
        tool_call.status = ToolCallStatus::Rejected;
        ai_repository.upsert_message(&message).await?;
        scope.save_changes().await?;
    }

    Ok(())
}

#[tauri::command]
pub async fn accept_tool_call(
    injector: State<'_, Arc<Injector>>,
    message_id: Guid,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let service = scope.resolve::<AiService>().await;
    service.accept_tool_call(message_id).await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn stop_ai_generation(injector: State<'_, Arc<Injector>>) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let state = scope.resolve::<AiState>().await;
    state.cancel_generation();
    Ok(())
}

#[tauri::command]
pub async fn get_all_ai_chats_sorted_by_date_desc(
    injector: State<'_, Arc<Injector>>,
) -> Result<Vec<Chat>, ApiError> {
    let scope = injector.start_scope();
    let chats = scope
        .resolve::<dyn AiRepository>()
        .await
        .get_all_chats_sorted_by_date_desc()
        .await?;
    Ok(chats)
}

#[tauri::command]
pub async fn delete_ai_chat(injector: State<'_, Arc<Injector>>, id: Guid) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn AiRepository>()
        .await
        .delete_chat(id)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn get_chat_messages_ordered(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<Vec<Message>, ApiError> {
    let scope = injector.start_scope();
    let messages = scope
        .resolve::<dyn AiRepository>()
        .await
        .get_chat_messages_ordered(id)
        .await?;
    Ok(messages)
}

#[tauri::command]
pub async fn rename_ai_chat(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
    new_title: String,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let ai_repository = scope.resolve::<dyn AiRepository>().await;
    let mut chat = ai_repository.get_chat_by_id(id).await?;
    chat.set_title(new_title);
    ai_repository.upsert_chat(&chat).await?;
    scope.save_changes().await?;
    Ok(())
}
