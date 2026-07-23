import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SourceResponseDto } from "../../api/sources/dto/sourceDto";

export interface SourcesState {
	sources: SourceResponseDto[];
	isLoading: boolean;
	loaded: boolean;
}

const initialState: SourcesState = {
	sources: [],
	isLoading: false,
	loaded: false,
};

const sourcesSlice = createSlice({
	name: "sources",
	initialState,
	reducers: {
		setSourcesLoading: state => {
			state.isLoading = true;
		},
		setSources: (state, action: PayloadAction<SourceResponseDto[]>) => {
			state.sources = action.payload;
			state.isLoading = false;
			state.loaded = true;
		},
		upsertSource: (state, action: PayloadAction<SourceResponseDto>) => {
			const index = state.sources.findIndex(
				s => s.id === action.payload.id,
			);
			if (index === -1) state.sources.push(action.payload);
			else state.sources[index] = action.payload;
		},
		removeSource: (state, action: PayloadAction<string>) => {
			state.sources = state.sources.filter(s => s.id !== action.payload);
		},
	},
});

export default sourcesSlice.reducer;

export const { setSourcesLoading, setSources, upsertSource, removeSource } =
	sourcesSlice.actions;
