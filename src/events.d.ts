import {
	TOOL_CALL_ACCEPTED_EVENT,
	ToolCallAcceptedPayload,
} from "./types/events/toolCallAcceptedEvent";

declare global {
	interface WindowEventMap {
		[TOOL_CALL_ACCEPTED_EVENT]: CustomEvent<ToolCallAcceptedPayload>;
	}
}

export {};
