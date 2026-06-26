import CardNodeDto from "./cardNodeDto";
import ExtractNodeDto from "./extractNodeDto";
import ReadingNodeDto from "./readingNodeDto";

export default interface FolderNodeDto {
	id: string;
	name: string;
	position: number;
	tags: string[];
	folders: FolderNodeDto[];
	readings: ReadingNodeDto[];
	extracts: ExtractNodeDto[];
	cards: CardNodeDto[];
}
