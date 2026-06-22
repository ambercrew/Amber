export type IncrementalReadingPriority = "high" | "normal" | "low";

export interface IncrementalReadingSource {
	type: "url";
	url: string;
}

export default interface IncrementalReading {
	content: string | null;
	title: string | null;
	source: IncrementalReadingSource;
	priority: IncrementalReadingPriority;
	completed: boolean;
	scrollPosition?: number | null;
}
