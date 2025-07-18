import parseGetFilesResponse from "../../utils/parseGetFilesResponse";
import {
	requestFailure,
	requestStart,
	requestSuccess,
} from "../reducers/fileSystemReducers";

import {
	createFolder as createFolderApi,
	deleteFolder as deleteFolderApi,
	moveFolder as moveFolderApi,
	deleteFile as deleteFileApi,
	moveFile as moveFileApi,
	renameFile as renameFileApi,
	createFile as createFileApi,
	getFiles as getFilesApi,
	renameFolder as renameFolderApi,
} from "../../api/fileApi";
import { importFile as importFileApi } from "../../api/exportImportApi";
import { AppDispatch, RootState } from "../store";
import errorToString from "../../utils/errorToString";

export function fetchFiles() {
	return executeRequest(() => Promise.resolve());
}

export function createFile(path: string) {
	return executeRequest(() => createFileApi(path));
}

export function createFolder(path: string) {
	return executeRequest(() => createFolderApi(path));
}

export function deleteFile(fileId: number) {
	return executeRequest(() => deleteFileApi(fileId));
}

export function deleteFolder(folderId: number) {
	return executeRequest(() => deleteFolderApi(folderId));
}

export function renameFile(fileId: number, newName: string) {
	return executeRequest(() => renameFileApi(fileId, newName));
}

export function renameFolder(folderId: number, newName: string) {
	return executeRequest(() => renameFolderApi(folderId, newName));
}

export function moveFile(fileId: number, destinationFolderId: number) {
	return executeRequest(() => moveFileApi(fileId, destinationFolderId));
}

export function moveFolder(folderId: number, destinationFolderId: number) {
	return executeRequest(() => moveFolderApi(folderId, destinationFolderId));
}

export function importFile(importItemPath: string, importIntoFolderId: number) {
	return executeRequest(() =>
		importFileApi(importItemPath, importIntoFolderId),
	);
}

function executeRequest<T>(
	cb: (dispatch: AppDispatch, state: RootState) => Promise<T>,
) {
	return async function (dispatch: AppDispatch, getState: () => RootState) {
		try {
			dispatch(requestStart());
			await cb(dispatch, getState());
			const files = await getFilesApi();
			const rootFolder = parseGetFilesResponse(files);
			dispatch(requestSuccess(rootFolder));
		} catch (e) {
			console.error(e);
			dispatch(requestFailure(errorToString(e)));
		}
	};
}
