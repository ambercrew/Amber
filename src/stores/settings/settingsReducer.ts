import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import Settings from "../../types/backend/model/settings";

export interface SettingsState {
	settings: Settings | null;
}

const initialState: SettingsState = {
	settings: null,
};

export const settingsSlice = createSlice({
	name: "settings",
	initialState,
	reducers: {
		setSettings: (state, payload: PayloadAction<Settings>) => {
			state.settings = payload.payload;
		},
	},
});

export default settingsSlice.reducer;

export const { setSettings } = settingsSlice.actions;
