import {
	deleteElement,
	getElementTree,
	renameElement,
} from "../../api/elements/api/elementsApi";
import { ElementId } from "../../types/elements/elementId";
import errorToString from "../../utils/errorToString";
import { AppDispatch } from "../store";
import { setTree, setTreeError, setTreeLoading } from "./elementsReducer";

export function loadElementTree() {
	return withTreeRefresh(() => Promise.resolve());
}

export function deleteElementAction(elementId: ElementId) {
	return withTreeRefresh(() => deleteElement(elementId));
}

export function renameElementAction(elementId: ElementId, newName: string) {
	return withTreeRefresh(() => renameElement(elementId, newName));
}

function withTreeRefresh(operation: () => Promise<void>) {
	return async function (dispatch: AppDispatch) {
		dispatch(setTreeLoading());
		try {
			await operation();
			const tree = await getElementTree();
			dispatch(setTree(tree));
		} catch (error) {
			dispatch(setTreeError(errorToString(error)));
		}
	};
}
