export type MessageContentDto =
	| { type: "human"; value: string }
	| { type: "document"; value: DocumentContentDto }
	| { type: "assistant"; value: string }
	| { type: "toolCall"; value: ToolCallContentDto }
	| { type: "toolResult"; value: ToolResultContentDto };

export interface DocumentContentDto {
	fileName: string;
}

export interface ToolCallContentDto {
	id: string;
	name: string;
	arguments: unknown;
}

export interface ToolResultContentDto {
	id: string;
	text: string;
}

export default interface MessageDto {
	id: string;
	createdDate: string;
	chatId: string;
	content: MessageContentDto;
}
