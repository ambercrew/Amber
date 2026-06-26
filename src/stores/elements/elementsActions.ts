import { getElementTree } from "../../api/elements/api/elementsApi";
import errorToString from "../../utils/errorToString";
import { AppDispatch } from "../store";
import { setTree, setTreeError, setTreeLoading } from "./elementsReducer";

export function loadElementTree() {
	return async function (dispatch: AppDispatch) {
		dispatch(setTreeLoading());
		try {
			const tree = await getElementTree();
			dispatch(setTree(tree));
		} catch (error) {
			dispatch(setTreeError(errorToString(error)));
		}
	};
}
