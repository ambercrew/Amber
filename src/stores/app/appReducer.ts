import { createSlice } from "@reduxjs/toolkit";

export interface AppState {
	startedInitialStateLoading: boolean;
	importModalOpened: boolean;
}

const initialState: AppState = {
	startedInitialStateLoading: false,
	importModalOpened: false,
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
	},
});

export default appSlice.reducer;

export const {
	markStartLoadingOfInitialState,
	openImportModal,
	closeImportModal,
} = appSlice.actions;
