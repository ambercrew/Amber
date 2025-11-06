import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import Settings from "../../types/backend/model/settings";

interface ISettingsState {
	settings: Settings | null;
}

const initialState: ISettingsState = {
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
