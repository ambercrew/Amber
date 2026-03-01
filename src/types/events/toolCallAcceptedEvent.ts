export const TOOL_CALL_ACCEPTED_EVENT = "toolCallAccepted";

export interface ToolCallAcceptedPayload {
	fileId: string | null;
}
