export default interface Message {
	id: string;
	chatId: string;
	content: MessageContent;
}

export type MessageContent =
	| MessageContentHumanAssistant
	| {
			type: "document";
			value: DocumentContent;
	  }
	| {
			type: "toolCall";
			value: ToolCallContent;
	  }
	| {
			type: "toolCallDisplay";
			value: ToolCallDisplayContent;
	  }
	| {
			type: "toolResult";
			value: ToolResultContent;
	  };

export interface DocumentContent {
	fileName: string;
}

export interface MessageContentHumanAssistant {
	type: "human" | "assistant";
	value: string | null;
}

export interface ToolCallContent {
	id: string;
	name: string;
	arguments: unknown;
}

export interface ToolCallDisplayContent {
	id: string;
	name: string;
	arguments: unknown;
	displayName: string;
	displayDescriptionMarkdown: string;
	status: ToolCallStatus;
	fileId: string | null;
}

export interface ToolResultContent {
	id: string;
	text: string;
}

export enum ToolCallStatus {
	Accepted = "accepted",
	Rejected = "rejected",
	Pending = "pending",
	AutomaticallyAccepted = "automaticallyAccepted",
}
