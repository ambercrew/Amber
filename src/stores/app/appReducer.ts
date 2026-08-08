import { createSlice } from "@reduxjs/toolkit";

export interface AppState {
	startedInitialStateLoading: boolean;
	importModalOpened: boolean;
	studyProfileModalOpened: boolean;
}

const initialState: AppState = {
	startedInitialStateLoading: false,
	importModalOpened: false,
	studyProfileModalOpened: false,
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
	},
});

export default appSlice.reducer;

export const {
	markStartLoadingOfInitialState,
	openImportModal,
	closeImportModal,
	openStudyProfileModal,
	closeStudyProfileModal,
} = appSlice.actions;
