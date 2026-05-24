import {
	requestFailure,
	requestStart,
	requestSuccess,
} from "./fileSystemReducers";

import {
	createFolder as createFolderApi,
	deleteFolder as deleteFolderApi,
	moveFolder as moveFolderApi,
	deleteFile as deleteFileApi,
	moveFile as moveFileApi,
	renameFile as renameFileApi,
	createFile as createFileApi,
	getReviewTreeFolderForRoot as getReviewTreeFolderForRootApi,
	renameFolder as renameFolderApi,
} from "../../api/fileSystem/api/fileSystemApi";
import { AppDispatch, RootState } from "../store";
import errorToString from "../../utils/errorToString";
import { moveCellToFile as moveCellToFileApi } from "../../api/cells/api/cellApi";
import {
	CELL_MOVED_TO_FILE,
	CellMovedToFilePayload,
} from "../../types/events/cellMovedToFileEvent";

export function getReviewTreeFolderForRoot() {
	return executeRequest(() => Promise.resolve());
}

export function createFile(name: string, parentId: string) {
	return executeRequest(() => createFileApi(name, parentId));
}

export function createFolder(name: string, parentId: string) {
	return executeRequest(() => createFolderApi(name, parentId));
}

export function deleteFile(fileId: string) {
	return executeRequest(() => deleteFileApi(fileId));
}

export function deleteFolder(folderId: string) {
	return executeRequest(() => deleteFolderApi(folderId));
}

export function renameFile(fileId: string, newName: string) {
	return executeRequest(() => renameFileApi(fileId, newName));
}

export function renameFolder(folderId: string, newName: string) {
	return executeRequest(() => renameFolderApi(folderId, newName));
}

export function moveFile(fileId: string, destinationFolderId: string) {
	return executeRequest(() => moveFileApi(fileId, destinationFolderId));
}

export function moveFolder(folderId: string, destinationFolderId: string) {
	return executeRequest(() => moveFolderApi(folderId, destinationFolderId));
}

export function moveCellToFile(cellId: string, fileId: string) {
	return executeRequest(async () => {
		await moveCellToFileApi(cellId, fileId);

		window.dispatchEvent(
			new CustomEvent<CellMovedToFilePayload>(CELL_MOVED_TO_FILE, {
				detail: {
					cellId,
				},
			}),
		);
	});
}

function executeRequest<T>(
	cb: (dispatch: AppDispatch, state: RootState) => Promise<T>,
) {
	return async function (dispatch: AppDispatch, getState: () => RootState) {
		try {
			dispatch(requestStart());
			const result = await cb(dispatch, getState());
			const reviewTreeFolder = await getReviewTreeFolderForRootApi();
			dispatch(requestSuccess(reviewTreeFolder));
			return result;
		} catch (e) {
			console.error(e);
			dispatch(requestFailure(errorToString(e)));
			return null;
		}
	};
}
