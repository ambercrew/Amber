import { RootState } from "../store";

export const selectElementTree = (state: RootState) => state.elements.tree;
export const selectElementTreeIsLoading = (state: RootState) =>
	state.elements.isLoading;
export const selectElementTreeError = (state: RootState) =>
	state.elements.error;
export const selectCurrentElement = (state: RootState) =>
	state.elements.currentElement;
