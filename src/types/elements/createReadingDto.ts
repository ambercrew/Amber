import { ReadingSource } from "./reading";

export interface CreateReadingDto {
	name: string;
	position: number;
	folderId: string;
	source: ReadingSource;
	body: string;
}
