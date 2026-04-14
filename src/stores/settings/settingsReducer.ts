import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import SettingsDto from "../../types/backend/dto/settingsDto";

export interface SettingsState {
	settings: SettingsDto | null;
}

const initialState: SettingsState = {
	settings: null,
};

export const settingsSlice = createSlice({
	name: "settings",
	initialState,
	reducers: {
		setSettings: (state, payload: PayloadAction<SettingsDto>) => {
			state.settings = payload.payload;
		},
	},
});

export default settingsSlice.reducer;

export const { setSettings } = settingsSlice.actions;
