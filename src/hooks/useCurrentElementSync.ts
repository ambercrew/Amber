import { useEffect } from "react";
import { elementExists, getElementById } from "../api/elements/api/elementsApi";
import { setCurrentElement } from "../stores/elements/elementsReducer";
import { selectElementTree } from "../stores/elements/elementsSelectors";
import { loadElementDetailsAction } from "../stores/elementDetails/elementDetailsActions";
import useAppDispatch from "./useAppDispatch";
import useAppSelector from "./useAppSelector";
import { useElementParams } from "./useElementParams";
import { ElementId } from "../types/elements/elementId";

export function useCurrentElementSync() {
	const params = useElementParams();
	const tree = useAppSelector(selectElementTree);
	const dispatch = useAppDispatch();

	useEffect(() => {
		if (!params?.type || !params.id) {
			dispatch(setCurrentElement(null));
			return;
		}
		const id = { type: params.type, id: params.id } satisfies ElementId;
		void elementExists(id).then(exists => {
			if (exists) {
				void getElementById(id).then(element =>
					dispatch(setCurrentElement(element)),
				);
				void dispatch(loadElementDetailsAction(id));
			}
		});
	}, [params?.type, params?.id, tree, dispatch]);
}
