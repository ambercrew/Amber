import CardNodeDto from "./cardNodeDto";

export default interface ExtractNodeDto {
	id: string;
	name: string;
	position: number;
	text: string;
	tags: string[];
	extracts: ExtractNodeDto[];
	cards: CardNodeDto[];
}
