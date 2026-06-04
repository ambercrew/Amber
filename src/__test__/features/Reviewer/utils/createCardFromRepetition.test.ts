import { Card, State } from "ts-fsrs";
import createCardFromRepetition from "../../../../features/Reviewer/utils/createCardFromRepetition";
import Repetition, {
	RepetitionState,
} from "../../../../api/cells/entities/repetition";

describe("createCardFromRepetition", () => {
	it("Returns correct on all status", () => {
		// Arrange

		const statePairs = [
			["new", State.New],
			["learning", State.Learning],
			["relearning", State.Relearning],
			["review", State.Review],
		];

		// Act & Assert

		for (const statePair of statePairs) {
			const repetition: Repetition = {
				due: "2000/12/12",
				state: statePair[0] as RepetitionState,
				id: "1",
				lastReview: "2005/5/5",
				reps: 1,
				lapses: 2,
				stability: 3,
				difficulty: 4,
				learningSteps: 5,
				scheduledDays: 6,
				cellId: "99",
				fileId: "99",
				additionalContent: null,
			};
			const expected: Card = {
				due: new Date("2000/12/12"),
				state: statePair[1] as State,
				last_review: new Date("2005/5/5"),
				reps: 1,
				lapses: 2,
				stability: 3,
				difficulty: 4,
				elapsed_days: 0,
				scheduled_days: 6,
				learning_steps: 5,
			};
			const actual = createCardFromRepetition(repetition);
			expect(actual).toStrictEqual(expected);
		}
	});
});
