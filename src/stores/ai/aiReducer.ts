import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AiState {
	focusedCellId: string | null;
}

const initialState: AiState = {
	focusedCellId: null,
};

const aiSlice = createSlice({
	name: "ai",
	initialState,
	reducers: {
		setFocusedCellId: (state, action: PayloadAction<string | null>) => {
			state.focusedCellId = action.payload;
		},
	},
});

export default aiSlice.reducer;

export const { setFocusedCellId } = aiSlice.actions;
