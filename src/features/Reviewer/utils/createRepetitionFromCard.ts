import { Card, State } from "ts-fsrs";
import Repetition, {
	RepetitionState,
} from "../../../types/backend/entity/repetition";

function createRepetitionFromCard(
	card: Card,
	id: string,
	fileId: string,
	cellId: string,
	additionalContent: string | null,
): Repetition {
	let state: RepetitionState;
	switch (card.state) {
		case State.New:
			state = "new";
			break;
		case State.Learning:
			state = "learning";
			break;
		case State.Relearning:
			state = "relearning";
			break;
		case State.Review:
			state = "review";
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
		lastReview: card.last_review?.toISOString() ?? null,
		elapsedDays: card.elapsed_days,
		scheduledDays: card.scheduled_days,
		additionalContent: additionalContent,
	};
}

export default createRepetitionFromCard;
