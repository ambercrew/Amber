import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TrashedElementDto } from "../../api/trash/dto/trashedElementDto";

export interface TrashState {
	items: TrashedElementDto[];
	isLoading: boolean;
	error: string | null;
}

const initialState: TrashState = {
	items: [],
	isLoading: false,
	error: null,
};

const trashSlice = createSlice({
	name: "trash",
	initialState,
	reducers: {
		setTrashLoading: state => {
			state.isLoading = true;
			state.error = null;
		},
		setTrash: (state, action: PayloadAction<TrashedElementDto[]>) => {
			state.items = action.payload;
			state.isLoading = false;
			state.error = null;
		},
		setTrashError: (state, action: PayloadAction<string>) => {
			state.error = action.payload;
			state.isLoading = false;
		},
		clearTrashError: state => {
			state.error = null;
		},
	},
});

export default trashSlice.reducer;

export const { setTrashLoading, setTrash, setTrashError, clearTrashError } =
	trashSlice.actions;
