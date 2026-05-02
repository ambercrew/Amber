import FileRepetitionCounts from "../../cells/valueObjects/fileRepetitionCounts";

export interface ReviewTreeFileDto {
	id: string;
	name: string;
	repetitionCounts: FileRepetitionCounts;
}
