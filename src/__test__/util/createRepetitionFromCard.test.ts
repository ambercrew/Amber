import { Card, State } from "ts-fsrs";
import createRepetitionFromCard from "../../features/Reviewer/utils/createRepetitionFromCard";
import Repetition from "../../types/backend/entity/repetition";

describe(createRepetitionFromCard, () => {
	it("Converts correctly", () => {
		// Arrange

		const dueDate = new Date();
		const lastReviewDate = new Date();
		const card: Card = {
			due: dueDate,
			state: State.New,
			last_review: lastReviewDate,
			reps: 1,
			lapses: 2,
			stability: 3,
			difficulty: 4,
			elapsed_days: 5,
			scheduled_days: 7,
		};
		const id = 8;
		const fileId = 9;
		const cellId = 10;
		const expected: Repetition = {
			cellId,
			fileId,
			id,
			due: dueDate.toISOString(),
			state: "New",
			lastReview: lastReviewDate.toISOString(),
			reps: 1,
			lapses: 2,
			stability: 3,
			difficulty: 4,
			elapsedDays: 5,
			scheduledDays: 7,
			additionalContent: "0",
		};

		// Act

		const actual = createRepetitionFromCard(card, id, fileId, cellId, "0");

		// Assert

		expect(actual).toStrictEqual(expected);
	});
});
