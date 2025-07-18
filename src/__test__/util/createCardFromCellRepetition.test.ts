import { Card, State } from "ts-fsrs";
import createCardFromRepetition from "../../utils/createCardFromRepetition";
import Repetition, {
	RepetitionState,
} from "../../types/backend/entity/repetition";

describe(createCardFromRepetition, () => {
	it("Returns correct on all status", () => {
		// Arrange

		const statePairs = [
			["New", State.New],
			["Learning", State.Learning],
			["Relearning", State.Relearning],
			["Review", State.Review],
		];

		// Act & Assert

		for (const statePair of statePairs) {
			const repetition: Repetition = {
				due: "2000/12/12",
				state: statePair[0] as RepetitionState,
				id: 1,
				lastReview: "2005/5/5",
				reps: 1,
				lapses: 2,
				stability: 3,
				difficulty: 4,
				elapsedDays: 5,
				scheduledDays: 6,
				cellId: 99,
				fileId: 99,
			};
			const expected: Card = {
				due: new Date("2000/12/12"),
				state: statePair[1] as State,
				last_review: new Date("2005/5/5"),
				reps: 1,
				lapses: 2,
				stability: 3,
				difficulty: 4,
				elapsed_days: 5,
				scheduled_days: 6,
				learning_steps: 0,
			};
			const actual = createCardFromRepetition(repetition);
			expect(actual).toStrictEqual(expected);
		}
	});
});
