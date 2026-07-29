export type BibliographicalSourceType = "File" | "WebPage";

export interface BibliographicalSourceDto {
	id: string;
	createdAt: string;
	modifiedAt: string;
	title: string;
	authors: string | null;
	publicationDate: string | null;
	sourceType: BibliographicalSourceType;
	location: string | null;
}

export interface BibliographicalSourceResponseDto extends BibliographicalSourceDto {
	elementCount: number;
}

export interface BibliographicalSourceRequestDto {
	title: string;
	authors: string | null;
	publicationDate: string | null;
	sourceType: BibliographicalSourceType;
	location: string | null;
}
