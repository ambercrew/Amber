export type SourceType = "File" | "WebPage";

export interface SourceDto {
	id: string;
	createdAt: string;
	modifiedAt: string;
	title: string;
	authors: string | null;
	publicationDate: string | null;
	sourceType: SourceType;
	location: string | null;
}

export interface SourceResponseDto extends SourceDto {
	elementCount: number;
}

export interface SourceRequestDto {
	title: string;
	authors: string | null;
	publicationDate: string | null;
	sourceType: SourceType;
	location: string | null;
}
