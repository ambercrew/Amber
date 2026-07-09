import ElementProfileRow from "../../../../features/Study/components/ElementProfileRow";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import {
	listStudyProfiles,
	getEffectiveStudyProfile,
} from "../../../../api/study/api/studyProfileApi";
import { getCardReview } from "../../../../api/study/api/studyApi";
import { StudyProfileDto } from "../../../../api/study/dto/studyProfileDto";
import { CardReviewDto } from "../../../../api/study/dto/cardReviewDto";

vi.mock(import("../../../../api/study/api/studyProfileApi.ts"));
vi.mock(import("../../../../api/study/api/studyApi.ts"));

const cardElementId = { type: "card" as const, id: "card-1" };

const profile: StudyProfileDto = {
	id: "profile-1",
	createdAt: "2024-01-01T00:00:00Z",
	modifiedAt: "2024-01-01T00:00:00Z",
	name: "Default",
	isDefault: true,
	desiredRetention: 0.9,
	defaultAFactor: 1.2,
	initialIntervalDays: 1,
	minIntervalDays: 1,
};

function makeReview(due: string): CardReviewDto {
	return {
		cardId: "card-1",
		due,
		stability: 1,
		difficulty: 1,
		reps: 1,
		lapses: 0,
		state: "review",
		lastReviewed: null,
	};
}

const BASE_STUDY_STATE = {
	status: "studying" as const,
	queue: [cardElementId],
	index: 0,
	cardPhase: "question" as const,
	shownAt: null,
	summary: null,
};

describe("ElementProfileRow", () => {
	beforeEach(() => {
		vi.mocked(listStudyProfiles).mockResolvedValue([profile]);
		vi.mocked(getEffectiveStudyProfile).mockResolvedValue({
			profile,
			source: "default",
			inheritedFrom: null,
		});
	});

	it("Should refetch the due date when the graded count changes without the element changing", async () => {
		// Arrange

		vi.mocked(getCardReview).mockResolvedValueOnce(
			makeReview("2024-01-01T00:00:00Z"),
		);
		const onDueChange = vi.fn();

		const { store } = renderWithProviders(
			<ElementProfileRow
				elementId={cardElementId}
				parentId={null}
				onDueChange={onDueChange}
			/>,
			{
				preloadedState: {
					study: {
						...BASE_STUDY_STATE,
						counts: { cards: 0, readings: 0, finished: 0 },
					},
				},
			},
		);

		await vi.waitFor(() => {
			expect(getCardReview).toHaveBeenCalledTimes(1);
		});

		// Act

		vi.mocked(getCardReview).mockResolvedValueOnce(
			makeReview("2099-01-01T00:00:00Z"),
		);
		store.dispatch({ type: "study/cardGraded" });

		// Assert

		await vi.waitFor(() => {
			expect(getCardReview).toHaveBeenCalledTimes(2);
		});
	});
});
