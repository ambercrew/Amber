import { ElementId } from "../../../types/elements/elementId";
import { ReadingSource } from "../../../types/elements/reading";

export interface MetaResponseDto {
	id: ElementId;
	name: string;
	parent: ElementId | null;
	position: string;
	tags: string[];
	createdAt: string;
	modifiedAt: string;
}

export interface FolderResponseDto {
	meta: MetaResponseDto;
}

export interface ReadingResponseDto {
	meta: MetaResponseDto;
	source: ReadingSource;
	body: string;
}

export interface ExtractResponseDto {
	meta: MetaResponseDto;
	text: string;
}

export interface CardResponseDto {
	meta: MetaResponseDto;
	front: string;
	back: string;
}

export type AnyElementDto =
	| { type: "folder"; data: FolderResponseDto }
	| { type: "reading"; data: ReadingResponseDto }
	| { type: "extract"; data: ExtractResponseDto }
	| { type: "card"; data: CardResponseDto };
