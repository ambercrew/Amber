import { PayloadAction, createSlice } from "@reduxjs/toolkit";

interface SyncState {
	isSyncing: boolean;
}

const initialState: SyncState = {
	isSyncing: false,
};

export const syncSlice = createSlice({
	name: "sync",
	initialState,
	reducers: {
		setIsSyncing: (state, payload: PayloadAction<boolean>) => {
			state.isSyncing = payload.payload;
		},
	},
});

export default syncSlice.reducer;

export const { setIsSyncing } = syncSlice.actions;
