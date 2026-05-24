import {
	TOOL_CALL_ACCEPTED_EVENT,
	ToolCallAcceptedPayload,
} from "./types/events/toolCallAcceptedEvent";

import {
	CELL_MOVED_TO_FILE,
	CellMovedToFilePayload,
} from "./types/events/cellMovedToFileEvent.ts";

declare global {
	interface WindowEventMap {
		[TOOL_CALL_ACCEPTED_EVENT]: CustomEvent<ToolCallAcceptedPayload>;
		[CELL_MOVED_TO_FILE]: CustomEvent<CellMovedToFilePayload>;
	}
}

export {};
