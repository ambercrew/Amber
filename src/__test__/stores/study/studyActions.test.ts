import { NavigateFunction } from "react-router";
import { setupStore } from "../../../stores/store";
import {
	finishReadingAction,
	gradeCardAction,
	nextReadingAction,
	skipReadingAction,
	startStudySession,
} from "../../../stores/study/studyActions";
import { StudyState } from "../../../stores/study/studyReducer";
import {
	finishReading,
	getDueElements,
	gradeCard,
	nextReading,
} from "../../../api/study/api/studyApi";
import { DueElementDto } from "../../../api/study/dto/dueElementDto";
import { AnyElementDto } from "../../../api/elements/dto/anyElementDto";
import { ElementsState } from "../../../stores/elements/elementsReducer";
import { CardReviewDto } from "../../../api/study/dto/cardReviewDto";
import { ReadingReviewDto } from "../../../api/study/dto/readingReviewDto";

vi.mock(import("../../../api/study/api/studyApi.ts"));

const META_FIELDS = {
	parent: null,
	position: "0",
	tags: [],
	createdAt: "2024-01-01T00:00:00Z",
	modifiedAt: "2024-01-01T00:00:00Z",
	sourceId: null,
	derivedFrom: null,
};

function cardQueueItem(id: string): DueElementDto {
	return { elementId: { type: "card", id }, title: `Card ${id}` };
}

function readingQueueItem(id: string): DueElementDto {
	return { elementId: { type: "reading", id }, title: `Reading ${id}` };
}

function cardElement(id: string): AnyElementDto {
	return {
		type: "card",
		data: {
			meta: {
				elementId: { type: "card", id },
				name: `Card ${id}`,
				...META_FIELDS,
			},
			front: "Front",
			back: "Back",
		},
	};
}

function readingElement(id: string): AnyElementDto {
	return {
		type: "reading",
		data: {
			meta: {
				elementId: { type: "reading", id },
				name: `Reading ${id}`,
				...META_FIELDS,
			},
			position: { positionSplit: 0, positionBlock: 0 },
			aFactor: 1.2,
		},
	};
}

function makeCardReview(due: string): CardReviewDto {
	return {
		cardId: "1",
		due,
		stability: 1,
		difficulty: 1,
		reps: 1,
		lapses: 0,
		state: "review",
		lastReviewed: null,
	};
}

const READING_REVIEW: ReadingReviewDto = {
	elementId: { type: "reading", id: "1" },
	due: "2024-02-01T00:00:00Z",
	intervalDays: 1,
	lastReviewed: "2024-01-01T00:00:00Z",
	finishedAt: null,
};

const BASE_STUDY_STATE: StudyState = {
	status: "studying",
	queue: [],
	cardPhase: "question",
	shownAt: null,
	counts: { cards: 0, readings: 0, finished: 0 },
	summary: null,
};

function elementsStateFor(currentElement: AnyElementDto): ElementsState {
	return { tree: [], isLoading: false, error: null, currentElement };
}

function inMs(offsetMs: number): string {
	return new Date(Date.now() + offsetMs).toISOString();
}

const IN_TWO_DAYS = () => inMs(2 * 24 * 3_600_000);
const IN_ONE_MINUTE = () => inMs(60_000);

describe("startStudySession", () => {
	it("Should not start a session when there are no due elements", async () => {
		// Arrange

		vi.mocked(getDueElements).mockResolvedValue([]);
		const navigate = vi.fn() as unknown as NavigateFunction;
		const store = setupStore();

		// Act

		const started = await store.dispatch(startStudySession(navigate));

		// Assert

		expect(started).toBe(false);
		expect(store.getState().study.status).toBe("editing");
		expect(navigate).not.toHaveBeenCalled();
	});

	it("Should start a session and navigate to the first due element", async () => {
		// Arrange

		const queue = [cardQueueItem("1"), readingQueueItem("2")];
		vi.mocked(getDueElements).mockResolvedValue(queue);
		const navigate = vi.fn() as unknown as NavigateFunction;
		const store = setupStore();

		// Act

		const started = await store.dispatch(startStudySession(navigate));

		// Assert

		expect(started).toBe(true);
		expect(store.getState().study.status).toBe("studying");
		expect(store.getState().study.queue).toEqual(queue);
		expect(navigate).toHaveBeenCalledWith(
			"/card/1",
			expect.objectContaining({ state: { studySessionNav: true } }),
		);
	});
});

describe("gradeCardAction", () => {
	it("Should remove the graded card and move forward to the next element", async () => {
		// Arrange

		vi.mocked(gradeCard).mockResolvedValue(makeCardReview(IN_TWO_DAYS()));
		const navigate = vi.fn() as unknown as NavigateFunction;
		const store = setupStore({
			study: {
				...BASE_STUDY_STATE,
				queue: [
					cardQueueItem("1"),
					cardQueueItem("2"),
					cardQueueItem("3"),
				],
			},
			elements: elementsStateFor(cardElement("1")),
		});

		// Act

		await store.dispatch(gradeCardAction("1", "good", navigate));

		// Assert

		const state = store.getState().study;
		expect(state.counts.cards).toBe(1);
		expect(state.queue.map(item => item.elementId.id)).toEqual(["2", "3"]);
		expect(navigate).toHaveBeenCalledWith(
			"/card/2",
			expect.objectContaining({ state: { studySessionNav: true } }),
		);
	});

	it("Should requeue the card instead of removing it when due again within the session horizon", async () => {
		// Arrange

		vi.mocked(gradeCard).mockResolvedValue(makeCardReview(IN_ONE_MINUTE()));
		const navigate = vi.fn() as unknown as NavigateFunction;
		const queue = Array.from({ length: 10 }, (_, i) =>
			cardQueueItem(`${i}`),
		);
		const store = setupStore({
			study: { ...BASE_STUDY_STATE, queue },
			elements: elementsStateFor(cardElement("0")),
		});

		// Act

		await store.dispatch(gradeCardAction("0", "again", navigate));

		// Assert

		const state = store.getState().study;
		expect(state.queue).toHaveLength(10);
		expect(state.queue.map(item => item.elementId.id)).toContain("0");
		expect(navigate).toHaveBeenCalledWith(
			"/card/1",
			expect.objectContaining({ state: { studySessionNav: true } }),
		);
	});

	it("Should wrap around to the front of the queue when the last element is completed and others remain", async () => {
		// Arrange

		vi.mocked(gradeCard).mockResolvedValue(makeCardReview(IN_TWO_DAYS()));
		const navigate = vi.fn() as unknown as NavigateFunction;
		const store = setupStore({
			study: {
				...BASE_STUDY_STATE,
				queue: [
					cardQueueItem("1"),
					cardQueueItem("2"),
					cardQueueItem("3"),
				],
			},
			elements: elementsStateFor(cardElement("3")),
		});

		// Act

		await store.dispatch(gradeCardAction("3", "good", navigate));

		// Assert

		const state = store.getState().study;
		expect(state.queue.map(item => item.elementId.id)).toEqual(["1", "2"]);
		expect(navigate).toHaveBeenCalledWith(
			"/card/1",
			expect.objectContaining({ state: { studySessionNav: true } }),
		);
	});

	it("Should end the session and set the summary once the last pending element is completed", async () => {
		// Arrange

		vi.mocked(gradeCard).mockResolvedValue(makeCardReview(IN_TWO_DAYS()));
		const navigate = vi.fn() as unknown as NavigateFunction;
		const store = setupStore({
			study: { ...BASE_STUDY_STATE, queue: [cardQueueItem("1")] },
			elements: elementsStateFor(cardElement("1")),
		});

		// Act

		await store.dispatch(gradeCardAction("1", "good", navigate));

		// Assert

		const state = store.getState().study;
		expect(state.status).toBe("editing");
		expect(state.queue).toEqual([]);
		expect(state.summary).toEqual({ cards: 1, readings: 0, finished: 0 });
		expect(navigate).not.toHaveBeenCalled();
	});
});

describe("nextReadingAction", () => {
	it("Should increment the reading count and advance to the next element", async () => {
		// Arrange

		vi.mocked(nextReading).mockResolvedValue(READING_REVIEW);
		const navigate = vi.fn() as unknown as NavigateFunction;
		const store = setupStore({
			study: {
				...BASE_STUDY_STATE,
				queue: [readingQueueItem("1"), readingQueueItem("2")],
			},
			elements: elementsStateFor(readingElement("1")),
		});

		// Act

		await store.dispatch(
			nextReadingAction({ type: "reading", id: "1" }, navigate),
		);

		// Assert

		const state = store.getState().study;
		expect(state.counts.readings).toBe(1);
		expect(state.queue.map(item => item.elementId.id)).toEqual(["2"]);
		expect(navigate).toHaveBeenCalledWith(
			"/reading/2",
			expect.objectContaining({ state: { studySessionNav: true } }),
		);
	});
});

describe("skipReadingAction", () => {
	it("Should move the skipped reading to the end of the queue and advance without incrementing any counts", () => {
		// Arrange

		const navigate = vi.fn() as unknown as NavigateFunction;
		const store = setupStore({
			study: {
				...BASE_STUDY_STATE,
				queue: [
					readingQueueItem("1"),
					readingQueueItem("2"),
					readingQueueItem("3"),
				],
			},
			elements: elementsStateFor(readingElement("1")),
		});

		// Act

		store.dispatch(
			skipReadingAction({ type: "reading", id: "1" }, navigate),
		);

		// Assert

		const state = store.getState().study;
		expect(state.queue.map(item => item.elementId.id)).toEqual([
			"2",
			"3",
			"1",
		]);
		expect(state.counts.readings).toBe(0);
		expect(state.counts.finished).toBe(0);
		expect(navigate).toHaveBeenCalledWith(
			"/reading/2",
			expect.objectContaining({ state: { studySessionNav: true } }),
		);
	});

	it("Should keep the session active and revisit the same element when skipping the only reading in the queue", () => {
		// Arrange

		const navigate = vi.fn() as unknown as NavigateFunction;
		const store = setupStore({
			study: { ...BASE_STUDY_STATE, queue: [readingQueueItem("1")] },
			elements: elementsStateFor(readingElement("1")),
		});

		// Act

		store.dispatch(
			skipReadingAction({ type: "reading", id: "1" }, navigate),
		);

		// Assert

		const state = store.getState().study;
		expect(state.status).toBe("studying");
		expect(state.queue.map(item => item.elementId.id)).toEqual(["1"]);
		expect(navigate).toHaveBeenCalledWith(
			"/reading/1",
			expect.objectContaining({ state: { studySessionNav: true } }),
		);
	});
});

describe("finishReadingAction", () => {
	it("Should increment the finished count and advance to the next element", async () => {
		// Arrange

		vi.mocked(finishReading).mockResolvedValue(READING_REVIEW);
		const navigate = vi.fn() as unknown as NavigateFunction;
		const store = setupStore({
			study: {
				...BASE_STUDY_STATE,
				queue: [readingQueueItem("1"), readingQueueItem("2")],
			},
			elements: elementsStateFor(readingElement("1")),
		});

		// Act

		await store.dispatch(
			finishReadingAction({ type: "reading", id: "1" }, navigate),
		);

		// Assert

		const state = store.getState().study;
		expect(state.counts.finished).toBe(1);
		expect(state.queue.map(item => item.elementId.id)).toEqual(["2"]);
		expect(navigate).toHaveBeenCalledWith(
			"/reading/2",
			expect.objectContaining({ state: { studySessionNav: true } }),
		);
	});
});
