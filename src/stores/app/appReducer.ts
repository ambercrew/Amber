import { createSlice } from "@reduxjs/toolkit";

export interface AppState {
	startedInitialStateLoading: boolean;
	importModalOpened: boolean;
	studyProfileModalOpened: boolean;
	settingsModalOpened: boolean;
	priorityDialogOpened: boolean;
	studySessionSettingsDialogOpened: boolean;
}

const initialState: AppState = {
	startedInitialStateLoading: false,
	importModalOpened: false,
	studyProfileModalOpened: false,
	settingsModalOpened: false,
	priorityDialogOpened: false,
	studySessionSettingsDialogOpened: false,
};

const appSlice = createSlice({
	name: "app",
	initialState,
	reducers: {
		markStartLoadingOfInitialState: state => {
			state.startedInitialStateLoading = true;
		},
		openImportModal: state => {
			state.importModalOpened = true;
		},
		closeImportModal: state => {
			state.importModalOpened = false;
		},
		openStudyProfileModal: state => {
			state.studyProfileModalOpened = true;
		},
		closeStudyProfileModal: state => {
			state.studyProfileModalOpened = false;
		},
		openSettingsModal: state => {
			state.settingsModalOpened = true;
		},
		closeSettingsModal: state => {
			state.settingsModalOpened = false;
		},
		openPriorityDialog: state => {
			state.priorityDialogOpened = true;
		},
		closePriorityDialog: state => {
			state.priorityDialogOpened = false;
		},
		openStudySessionSettingsDialog: state => {
			state.studySessionSettingsDialogOpened = true;
		},
		closeStudySessionSettingsDialog: state => {
			state.studySessionSettingsDialogOpened = false;
		},
	},
});

export default appSlice.reducer;

export const {
	markStartLoadingOfInitialState,
	openImportModal,
	closeImportModal,
	openStudyProfileModal,
	closeStudyProfileModal,
	openSettingsModal,
	closeSettingsModal,
	openPriorityDialog,
	closePriorityDialog,
	openStudySessionSettingsDialog,
	closeStudySessionSettingsDialog,
} = appSlice.actions;
