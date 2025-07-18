import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import ParsedFolder from "../../types/parsedFolder";

interface FileSystemState {
	error: string | null;
	rootFolder: ParsedFolder;
}

const initialState: FileSystemState = {
	error: null,
	rootFolder: {
		id: 0,
		files: [],
		name: "",
		subFolders: [],
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
		requestSuccess: (state, payload: PayloadAction<ParsedFolder>) => {
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
