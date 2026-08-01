import ChatDto from "./chatDto";

/** Wire shape of `StreamLlmResponseEvent` (src-tauri/src/ai_integration/services/ai_streamer.rs). */
type StreamLlmResponseEventDto =
	| { event: "createdChat"; data: ChatDto }
	| { event: "inProgress"; data: string }
	| { event: "error"; data: string };

export default StreamLlmResponseEventDto;
