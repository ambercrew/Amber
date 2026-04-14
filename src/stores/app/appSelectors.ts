import { RootState } from "../store";

export const selectStartedInitialStateLoading = (state: RootState) =>
	state.app.startedInitialStateLoading;
