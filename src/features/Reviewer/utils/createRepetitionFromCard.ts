import { Card, State } from "ts-fsrs";
import Repetition, {
	RepetitionState,
} from "../../../types/backend/entity/repetition";

function createRepetitionFromCard(
	card: Card,
	id: number,
	fileId: number,
	cellId: number,
	additionalContent?: string,
): Repetition {
	let state: RepetitionState;
	switch (card.state) {
		case State.New:
			state = "New";
			break;
		case State.Learning:
			state = "Learning";
			break;
		case State.Relearning:
			state = "Relearning";
			break;
		case State.Review:
			state = "Review";
			break;
	}

	return {
		id,
		fileId,
		cellId,
		state,
		due: card.due.toISOString(),
		reps: card.reps,
		lapses: card.lapses,
		stability: card.stability,
		difficulty: card.difficulty,
		lastReview: card.last_review!.toISOString(),
		elapsedDays: card.elapsed_days,
		scheduledDays: card.scheduled_days,
		additionalContent: additionalContent,
	};
}

export default createRepetitionFromCard;
