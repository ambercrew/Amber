import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import UpdateSettingsRequestDto from "../../api/settings/dto/updateSettingsRequestDto";

export interface SettingsState {
	settings: UpdateSettingsRequestDto | null;
}

const initialState: SettingsState = {
	settings: null,
};

export const settingsSlice = createSlice({
	name: "settings",
	initialState,
	reducers: {
		setSettings: (
			state,
			payload: PayloadAction<UpdateSettingsRequestDto>,
		) => {
			state.settings = payload.payload;
		},
	},
});

export default settingsSlice.reducer;

export const { setSettings } = settingsSlice.actions;
