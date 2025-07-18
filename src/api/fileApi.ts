import { invoke } from "@tauri-apps/api/core";
import FileWithRepetitionCounts from "../types/backend/dto/fileWithRepetitionCounts";

export function createFolder(path: string) {
	return invoke("create_folder", { path });
}

export function deleteFolder(folderId: number) {
	return invoke("delete_folder", { folderId });
}

export function moveFolder(folderId: number, destinationFolderId: number) {
	return invoke("move_folder", {
		folderId,
		destinationFolderId,
	});
}

export function renameFolder(folderId: number, newName: string) {
	return invoke("rename_folder", { folderId, newName });
}

export function deleteFile(fileId: number) {
	return invoke("delete_file", { fileId });
}

export function moveFile(fileId: number, destinationFolderId: number) {
	return invoke("move_file", {
		fileId,
		destinationFolderId,
	});
}

export function renameFile(fileId: number, newName: string) {
	return invoke("rename_file", { fileId, newName });
}

export function createFile(path: string) {
	return invoke("create_file", { path });
}

export function getFiles(): Promise<FileWithRepetitionCounts[]> {
	return invoke("get_files");
}
