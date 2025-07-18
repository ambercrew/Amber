import { Card, createEmptyCard, State } from "ts-fsrs";
import Repetition from "../../../types/backend/entity/repetition";

function createCardFromRepetition(repetition: Repetition): Card {
	const card = createEmptyCard();
	card.due = new Date(repetition.due);
	card.reps = repetition.reps;
	card.lapses = repetition.lapses;
	card.difficulty = repetition.difficulty;
	card.elapsed_days = repetition.elapsedDays;
	card.last_review = new Date(repetition.lastReview);
	card.stability = repetition.stability;
	card.scheduled_days = repetition.scheduledDays;

	switch (repetition.state) {
		case "New":
			card.state = State.New;
			break;
		case "Learning":
			card.state = State.Learning;
			break;
		case "Relearning":
			card.state = State.Relearning;
			break;
		case "Review":
			card.state = State.Review;
			break;
	}
	return card;
}

export default createCardFromRepetition;
