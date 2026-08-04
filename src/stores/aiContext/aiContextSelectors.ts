import { RootState } from "../store";

export const selectAiContextSnippets = (state: RootState) =>
	state.aiContext.snippets;
