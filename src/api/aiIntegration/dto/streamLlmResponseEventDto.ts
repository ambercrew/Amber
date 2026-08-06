import ChatDto from "./chatDto";
import { ToolCallContentDto, ToolResultContentDto } from "./messageDto";

/** Wire shape of `StreamLlmResponseEvent` (src-tauri/src/ai_integration/services/ai_streamer.rs). */
type StreamLlmResponseEventDto =
	| { event: "createdChat"; data: ChatDto }
	| { event: "inProgress"; data: { chatId: string; text: string } }
	| {
			event: "toolCall";
			data: { chatId: string; toolCall: ToolCallContentDto };
	  }
	| {
			event: "toolResult";
			data: { chatId: string; toolResult: ToolResultContentDto };
	  }
	| { event: "error"; data: string };

export default StreamLlmResponseEventDto;
