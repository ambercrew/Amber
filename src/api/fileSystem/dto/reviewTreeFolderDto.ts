import FileRepetitionCounts from "../../cells/valueObjects/fileRepetitionCounts";
import { ReviewTreeFileDto } from "./reviewTreeFileDto";

export interface ReviewTreeFolderDto {
	id: string;
	name: string;
	repetitionCounts: FileRepetitionCounts;
	subfolders: ReviewTreeFolderDto[];
	files: ReviewTreeFileDto[];
}
