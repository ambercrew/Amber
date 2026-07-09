import { NavigateFunction } from "react-router";
import {
	gradeCard,
	getDueElements,
	finishReading,
	nextReading,
} from "../../api/study/api/studyApi";
import { paths } from "../../paths";
import { ElementId } from "../../types/elements/elementId";
import { Rating } from "../../types/study/rating";
import { StudySessionLocationState } from "../../types/study/studySessionLocationState";
import { AppDispatch, RootState } from "../store";
import {
	cardGraded,
	cardRequeued,
	readingAdvanced,
	readingFinished,
	sessionAdvanced,
	sessionStarted,
} from "./studyReducer";

// A same-day relearning card is re-queued rather than dropped until "later
// today" only if its new due time still falls within the live session.
const SESSION_HORIZON_MS = 20 * 60 * 1000;

export function startStudySession(navigate: NavigateFunction) {
	return async (dispatch: AppDispatch): Promise<boolean> => {
		const queue = await getDueElements();
		if (queue.length === 0) return false;
		dispatch(sessionStarted(queue));
		navigateToElement(queue[0], navigate);
		return true;
	};
}

export function gradeCardAction(
	cardId: string,
	rating: Rating,
	navigate: NavigateFunction,
) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		const shownAt = getState().study.shownAt;
		const durationMs = shownAt ? Date.now() - shownAt : null;

		const review = await gradeCard(cardId, rating, durationMs);
		dispatch(cardGraded());

		const dueInMs = new Date(review.due).getTime() - Date.now();
		if (dueInMs <= SESSION_HORIZON_MS) {
			dispatch(cardRequeued());
		}

		advanceSession(dispatch, getState, navigate);
	};
}

export function nextReadingAction(
	elementId: ElementId,
	navigate: NavigateFunction,
) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		await nextReading(elementId);
		dispatch(readingAdvanced());
		advanceSession(dispatch, getState, navigate);
	};
}

export function finishReadingAction(
	elementId: ElementId,
	navigate: NavigateFunction,
) {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		await finishReading(elementId);
		dispatch(readingFinished());
		advanceSession(dispatch, getState, navigate);
	};
}

function advanceSession(
	dispatch: AppDispatch,
	getState: () => RootState,
	navigate: NavigateFunction,
) {
	const { queue, index } = getState().study;
	const nextElement = queue[index + 1];
	dispatch(sessionAdvanced());
	if (nextElement) navigateToElement(nextElement, navigate);
}

function navigateToElement(
	element: ElementId | undefined,
	navigate: NavigateFunction,
) {
	if (!element) return;
	const state: StudySessionLocationState = { studySessionNav: true };
	void navigate(paths.element(element.type, element.id), { state });
}
