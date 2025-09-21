import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ROOT_FOLDER_ID } from "../../config/constants";
import { ReviewTreeFolder } from "../../types/backend/dto/reviewTreeFolder";

interface FileSystemState {
	error: string | null;
	rootFolder: ReviewTreeFolder;
}

const initialState: FileSystemState = {
	error: null,
	rootFolder: {
		id: ROOT_FOLDER_ID,
		files: [],
		name: "",
		subfolders: [],
		repetitionCounts: {
			new: 0,
			learning: 0,
			relearning: 0,
			review: 0,
		},
	},
};

export const fileSystemSlice = createSlice({
	name: "fileSystem",
	initialState,
	reducers: {
		requestStart: state => {
			state.error = null;
		},
		requestSuccess: (state, payload: PayloadAction<ReviewTreeFolder>) => {
			state.error = null;
			state.rootFolder = payload.payload;
		},
		requestFailure: (state, payload: PayloadAction<string>) => {
			state.error = payload.payload;
		},
		setErrorMessage: (state, payload: PayloadAction<string>) => {
			state.error = payload.payload;
		},
	},
});

export default fileSystemSlice.reducer;

export const { requestStart, requestSuccess, requestFailure, setErrorMessage } =
	fileSystemSlice.actions;
