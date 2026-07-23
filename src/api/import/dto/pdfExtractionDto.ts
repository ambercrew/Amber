export interface PdfExtractionDto {
	title: string | null;
	authors: string | null;
	publicationDate: string | null;
	html: string;
	pageCount: number;
}
