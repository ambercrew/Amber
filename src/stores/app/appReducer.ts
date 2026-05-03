import { createSlice } from "@reduxjs/toolkit";

export interface AppState {
	startedInitialStateLoading: boolean;
}

const initialState: AppState = {
	startedInitialStateLoading: false,
};

const appSlice = createSlice({
	name: "app",
	initialState,
	reducers: {
		markStartLoadingOfInitialState: state => {
			state.startedInitialStateLoading = true;
		},
	},
});

export default appSlice.reducer;

export const { markStartLoadingOfInitialState } = appSlice.actions;
