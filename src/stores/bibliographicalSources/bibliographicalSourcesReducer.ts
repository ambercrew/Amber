import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BibliographicalSourceResponseDto } from "../../api/bibliographicalSources/dto/bibliographicalSourceDto";

export interface BibliographicalSourcesState {
	bibliographicalSources: BibliographicalSourceResponseDto[];
	isLoading: boolean;
	loaded: boolean;
}

const initialState: BibliographicalSourcesState = {
	bibliographicalSources: [],
	isLoading: false,
	loaded: false,
};

const bibliographicalSourcesSlice = createSlice({
	name: "bibliographicalSources",
	initialState,
	reducers: {
		setBibliographicalSourcesLoading: state => {
			state.isLoading = true;
		},
		setBibliographicalSources: (
			state,
			action: PayloadAction<BibliographicalSourceResponseDto[]>,
		) => {
			state.bibliographicalSources = action.payload;
			state.isLoading = false;
			state.loaded = true;
		},
		upsertBibliographicalSource: (
			state,
			action: PayloadAction<BibliographicalSourceResponseDto>,
		) => {
			const index = state.bibliographicalSources.findIndex(
				s => s.id === action.payload.id,
			);
			if (index === -1) state.bibliographicalSources.push(action.payload);
			else state.bibliographicalSources[index] = action.payload;
		},
		removeBibliographicalSource: (state, action: PayloadAction<string>) => {
			state.bibliographicalSources = state.bibliographicalSources.filter(
				s => s.id !== action.payload,
			);
		},
	},
});

export default bibliographicalSourcesSlice.reducer;

export const {
	setBibliographicalSourcesLoading,
	setBibliographicalSources,
	upsertBibliographicalSource,
	removeBibliographicalSource,
} = bibliographicalSourcesSlice.actions;
