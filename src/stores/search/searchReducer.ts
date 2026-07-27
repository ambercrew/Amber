import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface SearchState {
	opened: boolean;
	query: string;
	caseSensitive: boolean;
	currentIndex: number;
	totalMatches: number;
}

const initialState: SearchState = {
	opened: false,
	query: "",
	caseSensitive: false,
	currentIndex: -1,
	totalMatches: 0,
};

const searchSlice = createSlice({
	name: "search",
	initialState,
	reducers: {
		openSearch: state => {
			state.opened = true;
		},
		closeSearch: state => {
			state.opened = false;
			state.query = "";
			state.currentIndex = -1;
			state.totalMatches = 0;
		},
		setSearchQuery: (state, action: PayloadAction<string>) => {
			state.query = action.payload;
		},
		setSearchCaseSensitive: (state, action: PayloadAction<boolean>) => {
			state.caseSensitive = action.payload;
		},
		setSearchMatchCounts: (
			state,
			action: PayloadAction<{
				currentIndex: number;
				totalMatches: number;
			}>,
		) => {
			state.currentIndex = action.payload.currentIndex;
			state.totalMatches = action.payload.totalMatches;
		},
		goToNextMatch: state => {
			state.currentIndex = state.totalMatches
				? (state.currentIndex + 1) % state.totalMatches
				: -1;
		},
		goToPreviousMatch: state => {
			state.currentIndex = state.totalMatches
				? (state.currentIndex - 1 + state.totalMatches) %
					state.totalMatches
				: -1;
		},
	},
});

export default searchSlice.reducer;

export const {
	openSearch,
	closeSearch,
	setSearchQuery,
	setSearchCaseSensitive,
	setSearchMatchCounts,
	goToNextMatch,
	goToPreviousMatch,
} = searchSlice.actions;
