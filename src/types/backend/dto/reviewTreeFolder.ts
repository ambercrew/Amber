import FileRepetitionCounts from "../model/fileRepetitionCounts";

export interface ReviewTreeFolder {
	id: string;
	name: string;
	repetitionCounts: FileRepetitionCounts;
	subfolders: ReviewTreeFolder[];
	files: ReviewTreeFile[];
}

export interface ReviewTreeFile {
	id: string;
	name: string;
	repetitionCounts: FileRepetitionCounts;
}
