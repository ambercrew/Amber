import { ElementId } from "../../../types/elements/elementId";

/** Wire shape of the backend's `StreamAiRequestDto` (src-tauri/src/ai_integration/dto/stream_ai_request_dto.rs). */
export default interface StreamAiRequestDto {
	prompt: string;
	chatId: string | null;
	/** The element the user is currently viewing, if any. Never sent for chat-title generation. */
	elementId: ElementId | null;
	/** User-selected text snippets added as extra context. Never sent for chat-title generation. */
	contextSnippets: string[];
}
