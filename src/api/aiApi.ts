import { Channel, invoke } from "@tauri-apps/api/core";
import { StreamLlmResponseEvent } from "../types/backend/events/streamLlmResponseEvent";
import Chat from "../types/backend/entity/chat";
import Message from "../features/AiChatWidget/types/message";

export function streamAiResponse(
	prompt: string,
	chatId: string | null,
	onEvent: Channel<StreamLlmResponseEvent>,
): Promise<void> {
	return invoke("stream_ai_response", {
		prompt,
		onEvent,
		chatId,
	});
}

export function stopAiGeneration(): Promise<void> {
	return invoke("stop_ai_generation");
}

export function getAllAiChatsSortedByDateDesc(): Promise<Chat[]> {
	return invoke("get_all_ai_chats_sorted_by_date_desc");
}

export function deleteAiChat(id: string): Promise<string> {
	return invoke("delete_ai_chat", { id });
}

export function getChatMessagesOrdered(id: string): Promise<Message[]> {
	return invoke("get_chat_messages_ordered", { id });
}

export function renameAiChat(id: string, newTitle: string): Promise<void> {
	return invoke("rename_ai_chat", { id, newTitle });
}
