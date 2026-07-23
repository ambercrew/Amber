import { getElementDetails } from "../../api/elements/api/elementsApi";
import { ElementId } from "../../types/elements/elementId";
import { AppDispatch } from "../store";
import {
	setElementDetails,
	setElementDetailsLoading,
} from "./elementDetailsReducer";

export function loadElementDetailsAction(elementId: ElementId) {
	return async (dispatch: AppDispatch) => {
		dispatch(setElementDetailsLoading(elementId));
		const details = await getElementDetails(elementId);
		dispatch(setElementDetails({ elementId, details }));
	};
}
