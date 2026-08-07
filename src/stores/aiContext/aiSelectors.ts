import { RootState } from "../store";

export const selectAiContextSnippets = (state: RootState) => state.ai.snippets;
