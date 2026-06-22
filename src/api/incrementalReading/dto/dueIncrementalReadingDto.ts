import { IncrementalReadingPriority } from "../../cells/valueObjects/incrementalReading";

export default interface DueIncrementalReadingDto {
	cellId: string;
	fileId: string;
	title: string;
	priority: IncrementalReadingPriority;
	hasExtracts: boolean;
}
