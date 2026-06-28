import { ElementId } from "./elementId";
import { ReadingSource } from "./reading";

export interface CreateReadingDto {
	name: string;
	parent: ElementId | null;
	source: ReadingSource;
	body: string;
}
