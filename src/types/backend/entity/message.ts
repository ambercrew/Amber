export default interface Message {
	id: string;
	chatId: string;
	content: MessageContent;
}

export type MessageContent =
	| MessageContentHumanAssistant
	| MessageContentDocument
	| {
			type: "toolCall";
			value: ToolCall;
	  };

export interface MessageContentDocument {
	type: "document";
	value: {
		fileName: string;
	};
}

export interface MessageContentHumanAssistant {
	type: "human" | "assistant";
	value: string | null;
}

export interface ToolCall {
	id: string;
	displayName: string;
	displayDescriptionMarkdown: string;
	status: ToolCallStatus;
	fileId: string | null;
}

export enum ToolCallStatus {
	Accepted = "accepted",
	Rejected = "rejected",
	Pending = "pending",
	AutomaticallyAccepted = "automaticallyAccepted",
}
