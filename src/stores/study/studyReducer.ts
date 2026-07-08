import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ElementId } from "../../types/elements/elementId";

export type StudyStatus = "editing" | "studying";
export type CardPhase = "question" | "answer";

export interface StudyCounts {
	cards: number;
	readings: number;
	finished: number;
}

export interface StudyState {
	status: StudyStatus;
	queue: ElementId[];
	index: number;
	cardPhase: CardPhase;
	shownAt: number | null;
	counts: StudyCounts;
	summary: StudyCounts | null;
}

// How far into the session (in queue slots) an Again-rated card is
// re-inserted so the session can still drain it to done today.
const SESSION_REQUEUE_OFFSET = 8;

const initialState: StudyState = {
	status: "editing",
	queue: [],
	index: 0,
	cardPhase: "question",
	shownAt: null,
	counts: { cards: 0, readings: 0, finished: 0 },
	summary: null,
};

const studySlice = createSlice({
	name: "study",
	initialState,
	reducers: {
		sessionStarted: (state, action: PayloadAction<ElementId[]>) => {
			state.status = "studying";
			state.queue = action.payload;
			state.index = 0;
			state.cardPhase = "question";
			state.shownAt = Date.now();
			state.counts = { cards: 0, readings: 0, finished: 0 };
			state.summary = null;
		},
		answerShown: state => {
			state.cardPhase = "answer";
		},
		cardGraded: state => {
			state.counts.cards += 1;
		},
		cardRequeued: state => {
			const current = state.queue[state.index];
			if (!current) return;
			const insertAt = Math.min(
				state.index + SESSION_REQUEUE_OFFSET,
				state.queue.length,
			);
			state.queue.splice(state.index, 1);
			state.queue.splice(insertAt - 1, 0, current);
		},
		readingAdvanced: state => {
			state.counts.readings += 1;
		},
		readingFinished: state => {
			state.counts.finished += 1;
		},
		sessionAdvanced: state => {
			const nextIndex = state.index + 1;
			if (nextIndex >= state.queue.length) {
				state.summary = { ...state.counts };
				resetSession(state);
			} else {
				state.index = nextIndex;
				state.cardPhase = "question";
				state.shownAt = Date.now();
			}
		},
		sessionStopped: resetSession,
		summaryDismissed: state => {
			state.summary = null;
		},
	},
});

function resetSession(state: StudyState) {
	state.status = "editing";
	state.queue = [];
	state.index = 0;
	state.cardPhase = "question";
	state.shownAt = null;
}

export default studySlice.reducer;

export const {
	sessionStarted,
	answerShown,
	cardGraded,
	cardRequeued,
	readingAdvanced,
	readingFinished,
	sessionAdvanced,
	sessionStopped,
	summaryDismissed,
} = studySlice.actions;
