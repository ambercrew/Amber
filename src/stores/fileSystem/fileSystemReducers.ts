import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ROOT_FOLDER_ID } from "../../config/constants";
import { ReviewTreeFolder } from "../../types/backend/dto/reviewTreeFolder";

interface FileSystemState {
	errorMessage: string | null;
	successMessage: string | null;
	rootFolder: ReviewTreeFolder;
}

const initialState: FileSystemState = {
	errorMessage: null,
	successMessage: null,
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
			state.errorMessage = null;
			state.successMessage = null;
		},
		requestSuccess: (state, payload: PayloadAction<ReviewTreeFolder>) => {
			state.rootFolder = payload.payload;
		},
		requestFailure: (state, payload: PayloadAction<string>) => {
			state.errorMessage = payload.payload;
		},
		setErrorMessage: (state, payload: PayloadAction<string>) => {
			state.errorMessage = payload.payload;
		},
		setSuccessMessage: (state, payload: PayloadAction<string>) => {
			state.successMessage = payload.payload;
		},
	},
});

export default fileSystemSlice.reducer;

export const {
	requestStart,
	requestSuccess,
	requestFailure,
	setErrorMessage,
	setSuccessMessage,
} = fileSystemSlice.actions;
