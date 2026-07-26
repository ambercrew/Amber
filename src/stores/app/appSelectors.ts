import { RootState } from "../store";

export const selectStartedInitialStateLoading = (state: RootState) =>
	state.app.startedInitialStateLoading;

export const selectIsImportModalOpened = (state: RootState) =>
	state.app.importModalOpened;

export const selectIsStudyProfileModalOpened = (state: RootState) =>
	state.app.studyProfileModalOpened;

export const selectIsSettingsModalOpened = (state: RootState) =>
	state.app.settingsModalOpened;

export const selectIsPriorityDialogOpened = (state: RootState) =>
	state.app.priorityDialogOpened;

export const selectIsStudySessionSettingsDialogOpened = (state: RootState) =>
	state.app.studySessionSettingsDialogOpened;
