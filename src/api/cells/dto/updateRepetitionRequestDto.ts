import { RepetitionState } from "../entities/repetition";

export default interface UpdateRepetitionRequestDto {
	id: string;
	fileId: string;
	cellId: string;
	due: string;
	stability: number;
	difficulty: number;
	learningSteps: number;
	scheduledDays: number;
	reps: number;
	lapses: number;
	state: RepetitionState;
	lastReview: string | null;
	additionalContent: string | null;
}
