import { ElementId } from "../../../types/elements/elementId";
import { Tag } from "../../../types/elements/tag";

export interface MetaResponseDto {
	elementId: ElementId;
	name: string;
	parent: ElementId | null;
	position: string;
	tags: Tag[];
	createdAt: string;
	modifiedAt: string;
}

export interface FolderResponseDto {
	meta: MetaResponseDto;
}

export interface ReadingResponseDto {
	meta: MetaResponseDto;
	positionSplit: number;
	positionBlock: number;
	aFactor: number;
}

export interface ExtractResponseDto {
	meta: MetaResponseDto;
	content: string;
	aFactor: number;
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
