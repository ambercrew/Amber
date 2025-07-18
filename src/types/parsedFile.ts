import FileRepetitionCounts from "./backend/model/fileRepetitionCounts";

export default interface ParsedFile {
	id: number;
	name: string;
	repetitionCounts: FileRepetitionCounts;
}
