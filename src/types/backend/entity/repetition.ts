export type RepetitionState = "new" | "learning" | "relearning" | "review";

export default interface Repetition {
	id: string;
	fileId: string;
	cellId: string;
	due: string;
	stability: number;
	difficulty: number;
	elapsedDays: number;
	scheduledDays: number;
	reps: number;
	lapses: number;
	state: RepetitionState;
	lastReview: string | null;
	additionalContent: string | null;
}
