import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
		aFactor: 1.2,
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
	it("Should show a due date preview in each rating button's tooltip once the preview loads", async () => {
		// Arrange

		const user = userEvent.setup();
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

		const dueByRating = {
			Again: again,
			Hard: hard,
			Good: good,
			Easy: easy,
		};
		for (const [name, due] of Object.entries(dueByRating)) {
			await user.hover(screen.getByRole("button", { name }));
			expect(
				await screen.findByText(formatRelativeDueDate(due), {
					exact: false,
				}),
			).toBeInTheDocument();
			await user.unhover(screen.getByRole("button", { name }));
		}
	});

	it("Should not show a due date preview in the rating buttons' tooltips before the preview loads", async () => {
		// Arrange

		const user = userEvent.setup();
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

		const againButton = screen.getByRole("button", { name: "Again" });
		expect(againButton).toBeVisible();
		await user.hover(againButton);
		expect(await screen.findByRole("tooltip")).toHaveTextContent("(1)");
		expect(screen.queryByText(/In \d/)).not.toBeInTheDocument();
	});

	it("Should show a due date preview in the Next button's tooltip once the preview loads", async () => {
		// Arrange

		const user = userEvent.setup();
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
		await user.hover(screen.getByRole("button", { name: "Next" }));

		// Assert

		expect(
			await screen.findByText(formatRelativeDueDate(due), {
				exact: false,
			}),
		).toBeInTheDocument();
	});

	it("Should not show a due date preview in the Finish button's tooltip", async () => {
		// Arrange

		const user = userEvent.setup();
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
		await user.hover(screen.getByRole("button", { name: "Finish" }));

		// Assert

		const tooltip = await screen.findByRole("tooltip");
		expect(tooltip).not.toHaveTextContent(formatRelativeDueDate(due));
		expect(tooltip).toHaveTextContent("Won't repeat (3)");
	});
});
