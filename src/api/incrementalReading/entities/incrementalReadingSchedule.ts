import { IncrementalReadingPriority } from "../../cells/valueObjects/incrementalReading";

export default interface IncrementalReadingSchedule {
	id: string;
	createdDate: string;
	modifiedDate: string;
	cellId: string;
	priority: IncrementalReadingPriority;
	title: string;
	nextReadingDate: string;
	completed: boolean;
	hasExtracts: boolean;
}
