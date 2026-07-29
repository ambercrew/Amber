import {
	assignBibliographicalSource,
	createBibliographicalSource,
	deleteBibliographicalSource,
	listBibliographicalSources,
	updateBibliographicalSource,
} from "../../api/bibliographicalSources/api/bibliographicalSourcesApi";
import {
	BibliographicalSourceRequestDto,
	BibliographicalSourceResponseDto,
} from "../../api/bibliographicalSources/dto/bibliographicalSourceDto";
import { ElementId } from "../../types/elements/elementId";
import { setCurrentElementMeta } from "../elements/elementsReducer";
import { AppDispatch, RootState } from "../store";
import {
	removeBibliographicalSource,
	setBibliographicalSources,
	setBibliographicalSourcesLoading,
	upsertBibliographicalSource,
} from "./bibliographicalSourcesReducer";
import { selectBibliographicalSourcesLoaded } from "./bibliographicalSourcesSelectors";

export function loadBibliographicalSourcesAction() {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		if (selectBibliographicalSourcesLoaded(getState())) return;
		dispatch(setBibliographicalSourcesLoading());
		const bibliographicalSources = await listBibliographicalSources();
		dispatch(setBibliographicalSources(bibliographicalSources));
	};
}

export function refreshBibliographicalSourcesAction() {
	return async (dispatch: AppDispatch) => {
		dispatch(setBibliographicalSourcesLoading());
		const bibliographicalSources = await listBibliographicalSources();
		dispatch(setBibliographicalSources(bibliographicalSources));
	};
}

export function createBibliographicalSourceAction(
	dto: BibliographicalSourceRequestDto,
) {
	return async (
		dispatch: AppDispatch,
	): Promise<BibliographicalSourceResponseDto> => {
		const created = await createBibliographicalSource(dto);
		dispatch(upsertBibliographicalSource(created));
		return created;
	};
}

export function updateBibliographicalSourceAction(
	id: string,
	dto: BibliographicalSourceRequestDto,
) {
	return async (dispatch: AppDispatch) => {
		const updated = await updateBibliographicalSource(id, dto);
		dispatch(upsertBibliographicalSource(updated));
	};
}

export function deleteBibliographicalSourceAction(id: string) {
	return async (dispatch: AppDispatch) => {
		await deleteBibliographicalSource(id);
		dispatch(removeBibliographicalSource(id));
	};
}

export function assignBibliographicalSourceAction(
	elementId: ElementId,
	bibliographicalSourceId: string | null,
) {
	return async (dispatch: AppDispatch) => {
		await assignBibliographicalSource(elementId, bibliographicalSourceId);
		dispatch(setCurrentElementMeta({ bibliographicalSourceId }));
	};
}
