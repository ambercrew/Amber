import { Card, createEmptyCard, State } from "ts-fsrs";
import Repetition from "../../../api/cells/entities/repetition";

function createCardFromRepetition(repetition: Repetition): Card {
	const card = createEmptyCard();
	card.due = new Date(repetition.due);
	card.reps = repetition.reps;
	card.lapses = repetition.lapses;
	card.difficulty = repetition.difficulty;
	card.elapsed_days = repetition.elapsedDays;
	card.last_review = repetition.lastReview
		? new Date(repetition.lastReview)
		: undefined;
	card.stability = repetition.stability;
	card.scheduled_days = repetition.scheduledDays;

	switch (repetition.state) {
		case "new":
			card.state = State.New;
			break;
		case "learning":
			card.state = State.Learning;
			break;
		case "relearning":
			card.state = State.Relearning;
			break;
		case "review":
			card.state = State.Review;
			break;
	}
	return card;
}

export default createCardFromRepetition;
