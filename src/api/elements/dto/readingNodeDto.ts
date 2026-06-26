import CardNodeDto from "./cardNodeDto";
import ExtractNodeDto from "./extractNodeDto";

export default interface ReadingNodeDto {
	id: string;
	name: string;
	position: number;
	tags: string[];
	extracts: ExtractNodeDto[];
	cards: CardNodeDto[];
}
