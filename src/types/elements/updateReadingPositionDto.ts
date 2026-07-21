import { ReadingPosition } from "./readingPosition";

export interface UpdateReadingPositionDto {
	readingId: string;
	position: ReadingPosition;
}
