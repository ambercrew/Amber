import { RootState } from "../store";

export const selectStudyStatus = (state: RootState) => state.study.status;
export const selectStudyQueue = (state: RootState) => state.study.queue;
export const selectStudyIndex = (state: RootState) => state.study.index;
export const selectStudyCurrentElement = (state: RootState) =>
	state.study.queue[state.study.index] ?? null;
export const selectStudyCardPhase = (state: RootState) => state.study.cardPhase;
export const selectStudyShownAt = (state: RootState) => state.study.shownAt;
export const selectStudyCounts = (state: RootState) => state.study.counts;
export const selectStudySummary = (state: RootState) => state.study.summary;
