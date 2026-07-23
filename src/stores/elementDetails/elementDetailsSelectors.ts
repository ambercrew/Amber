import { RootState } from "../store";
import { selectCurrentElement } from "../elements/elementsSelectors";

export const selectElementDetailsIsLoading = (state: RootState) =>
	state.elementDetails.isLoading;

/**
 * Only returns the loaded details when they match the current element —
 * while a different element's details are still in flight, callers should
 * see `null` rather than the previous element's stale data.
 */
export function selectCurrentElementDetails(state: RootState) {
	const currentElement = selectCurrentElement(state);
	const elementId = currentElement?.data.meta.elementId;
	const { elementId: loadedFor, details } = state.elementDetails;
	if (!elementId || !details || !loadedFor) return null;
	if (loadedFor.type !== elementId.type || loadedFor.id !== elementId.id)
		return null;
	return details;
}
