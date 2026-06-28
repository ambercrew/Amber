import {
	createCard,
	createExtract,
	createFolder,
	createReading,
	deleteElement,
	getElementTree,
	moveElement,
	MoveElementDto,
	renameElement,
} from "../../api/elements/api/elementsApi";
import { CreateCardDto } from "../../types/elements/createCardDto";
import { CreateExtractDto } from "../../types/elements/createExtractDto";
import { CreateFolderDto } from "../../types/elements/createFolderDto";
import { CreateReadingDto } from "../../types/elements/createReadingDto";
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

export function createFolderAction(dto: CreateFolderDto) {
	return withTreeRefresh(() => createFolder(dto));
}

export function createReadingAction(dto: CreateReadingDto) {
	return withTreeRefresh(() => createReading(dto));
}

export function createExtractAction(dto: CreateExtractDto) {
	return withTreeRefresh(() => createExtract(dto));
}

export function createCardAction(dto: CreateCardDto) {
	return withTreeRefresh(() => createCard(dto));
}

export function moveElementAction(dto: MoveElementDto) {
	return withTreeRefresh(() => moveElement(dto));
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
