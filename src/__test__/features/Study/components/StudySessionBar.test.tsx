import { screen } from "@testing-library/react";
import StudySessionBar from "../../../../features/Study/components/StudySessionBar";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import {
	previewCardReview,
	previewNextReading,
} from "../../../../api/study/api/studyApi";
import { AnyElementDto } from "../../../../api/elements/dto/anyElementDto";
import { formatRelativeDueDate } from "../../../../utils/formatRelativeDueDate";

vi.mock(import("../../../../api/study/api/studyApi.ts"));

const cardElementId = { type: "card" as const, id: "card-1" };
const readingElementId = { type: "reading" as const, id: "reading-1" };
const cardQueueItem = { elementId: cardElementId, title: "Card 1" };
const readingQueueItem = { elementId: readingElementId, title: "Reading 1" };

const META_FIELDS = {
	parent: null,
	position: "0",
	tags: [],
	createdAt: "2024-01-01T00:00:00Z",
	modifiedAt: "2024-01-01T00:00:00Z",
};

const cardCurrentElement: AnyElementDto = {
	type: "card",
	data: {
		meta: { elementId: cardElementId, name: "Card 1", ...META_FIELDS },
		front: "Front",
		back: "Back",
	},
};

const readingCurrentElement: AnyElementDto = {
	type: "reading",
	data: {
		meta: {
			elementId: readingElementId,
			name: "Reading 1",
			...META_FIELDS,
		},
		content: "",
	},
};

const BASE_STUDY_STATE = {
	status: "studying" as const,
	shownAt: null,
	counts: { cards: 0, readings: 0, finished: 0 },
	summary: null,
};

function elementsStateFor(currentElement: AnyElementDto) {
	return { tree: [], isLoading: false, error: null, currentElement };
}

function inMs(offsetMs: number): string {
	return new Date(Date.now() + offsetMs).toISOString();
}

describe("StudySessionBar", () => {
	it("Should show a due date preview under each rating button once the preview loads", async () => {
		// Arrange

		const again = inMs(30 * 60_000);
		const hard = inMs(2 * 24 * 3_600_000);
		const good = inMs(4 * 24 * 3_600_000);
		const easy = inMs(8 * 24 * 3_600_000);
		vi.mocked(previewCardReview).mockResolvedValue({
			again,
			hard,
			good,
			easy,
		});

		// Act

		renderWithProviders(<StudySessionBar />, {
			preloadedState: {
				study: {
					...BASE_STUDY_STATE,
					queue: [cardQueueItem],
					cardPhase: "answer",
				},
				elements: elementsStateFor(cardCurrentElement),
			},
		});

		// Assert

		expect(
			await screen.findByText(formatRelativeDueDate(again)),
		).toBeInTheDocument();
		expect(
			screen.getByText(formatRelativeDueDate(hard)),
		).toBeInTheDocument();
		expect(
			screen.getByText(formatRelativeDueDate(good)),
		).toBeInTheDocument();
		expect(
			screen.getByText(formatRelativeDueDate(easy)),
		).toBeInTheDocument();
	});

	it("Should not show a due date preview under the rating buttons before the preview loads", () => {
		// Arrange

		vi.mocked(previewCardReview).mockReturnValue(
			new Promise(() => {
				// Never resolves; asserting the pre-load state.
			}),
		);

		// Act

		renderWithProviders(<StudySessionBar />, {
			preloadedState: {
				study: {
					...BASE_STUDY_STATE,
					queue: [cardQueueItem],
					cardPhase: "answer",
				},
				elements: elementsStateFor(cardCurrentElement),
			},
		});

		// Assert

		expect(screen.getByRole("button", { name: "Again" })).toBeVisible();
		expect(screen.queryByText(/In \d/)).not.toBeInTheDocument();
	});

	it("Should show a due date preview under the Next button once the preview loads", async () => {
		// Arrange

		const due = inMs(2 * 24 * 3_600_000);
		vi.mocked(previewNextReading).mockResolvedValue(due);

		// Act

		renderWithProviders(<StudySessionBar />, {
			preloadedState: {
				study: {
					...BASE_STUDY_STATE,
					queue: [readingQueueItem],
					cardPhase: "question",
				},
				elements: elementsStateFor(readingCurrentElement),
			},
		});

		// Assert

		expect(
			await screen.findByText(formatRelativeDueDate(due)),
		).toBeInTheDocument();
	});

	it("Should not show a due date preview under the Finish button", async () => {
		// Arrange

		const due = inMs(2 * 24 * 3_600_000);
		vi.mocked(previewNextReading).mockResolvedValue(due);

		// Act

		renderWithProviders(<StudySessionBar />, {
			preloadedState: {
				study: {
					...BASE_STUDY_STATE,
					queue: [readingQueueItem],
					cardPhase: "question",
				},
				elements: elementsStateFor(readingCurrentElement),
			},
		});
		await screen.findByText(formatRelativeDueDate(due));

		// Assert

		const finishButton = screen.getByRole("button", { name: "Finish" });
		expect(finishButton.parentElement).toHaveTextContent("Finish");
	});
});
