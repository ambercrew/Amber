import { RootState } from "../store";

export const selectSettings = (state: RootState) => state.settings.settings;
