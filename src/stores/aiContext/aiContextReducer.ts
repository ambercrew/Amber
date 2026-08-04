import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AiContextSnippet {
	id: string;
	text: string;
}

export interface AiContextState {
	snippets: AiContextSnippet[];
}

const initialState: AiContextState = {
	snippets: [],
};

const aiContextSlice = createSlice({
	name: "aiContext",
	initialState,
	reducers: {
		addAiContextSnippet: (state, action: PayloadAction<string>) => {
			state.snippets.push({
				id: crypto.randomUUID(),
				text: action.payload,
			});
		},
		removeAiContextSnippet: (state, action: PayloadAction<string>) => {
			state.snippets = state.snippets.filter(
				snippet => snippet.id !== action.payload,
			);
		},
		clearAiContextSnippets: state => {
			state.snippets = [];
		},
		restoreAiContextSnippets: (
			state,
			action: PayloadAction<AiContextSnippet[]>,
		) => {
			state.snippets = [...action.payload, ...state.snippets];
		},
	},
});

export default aiContextSlice.reducer;

export const {
	addAiContextSnippet,
	removeAiContextSnippet,
	clearAiContextSnippets,
	restoreAiContextSnippets,
} = aiContextSlice.actions;
