import {
	assignSource,
	createSource,
	deleteSource,
	listSources,
	updateSource,
} from "../../api/sources/api/sourcesApi";
import {
	SourceRequestDto,
	SourceResponseDto,
} from "../../api/sources/dto/sourceDto";
import { ElementId } from "../../types/elements/elementId";
import { setCurrentElementMeta } from "../elements/elementsReducer";
import { AppDispatch, RootState } from "../store";
import {
	removeSource,
	setSources,
	setSourcesLoading,
	upsertSource,
} from "./sourcesReducer";
import { selectSourcesLoaded } from "./sourcesSelectors";

export function loadSourcesAction() {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		if (selectSourcesLoaded(getState())) return;
		dispatch(setSourcesLoading());
		const sources = await listSources();
		dispatch(setSources(sources));
	};
}

export function refreshSourcesAction() {
	return async (dispatch: AppDispatch) => {
		dispatch(setSourcesLoading());
		const sources = await listSources();
		dispatch(setSources(sources));
	};
}

export function createSourceAction(dto: SourceRequestDto) {
	return async (dispatch: AppDispatch): Promise<SourceResponseDto> => {
		const created = await createSource(dto);
		dispatch(upsertSource(created));
		return created;
	};
}

export function updateSourceAction(id: string, dto: SourceRequestDto) {
	return async (dispatch: AppDispatch) => {
		const updated = await updateSource(id, dto);
		dispatch(upsertSource(updated));
	};
}

export function deleteSourceAction(id: string) {
	return async (dispatch: AppDispatch) => {
		await deleteSource(id);
		dispatch(removeSource(id));
	};
}

export function assignSourceAction(
	elementId: ElementId,
	sourceId: string | null,
) {
	return async (dispatch: AppDispatch) => {
		await assignSource(elementId, sourceId);
		dispatch(setCurrentElementMeta({ sourceId }));
	};
}
