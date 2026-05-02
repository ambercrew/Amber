import { invoke } from "@tauri-apps/api/core";
import { ReviewTreeFolderDto } from "../dto/reviewTreeFolderDto";

export function createFolder(name: string, parentId: string): Promise<string> {
	return invoke("create_folder", { name, parentId });
}

export function deleteFolder(folderId: string) {
	return invoke("delete_folder", { folderId });
}

export function moveFolder(folderId: string, destinationFolderId: string) {
	return invoke("move_folder", {
		folderId,
		destinationFolderId,
	});
}

export function renameFolder(folderId: string, newName: string) {
	return invoke("rename_folder", { folderId, newName });
}

export function deleteFile(fileId: string) {
	return invoke("delete_file", { fileId });
}

export function moveFile(fileId: string, destinationFolderId: string) {
	return invoke("move_file", {
		fileId,
		destinationFolderId,
	});
}

export function renameFile(fileId: string, newName: string) {
	return invoke("rename_file", { fileId, newName });
}

export function createFile(name: string, parentId: string): Promise<string> {
	return invoke("create_file", { name, parentId });
}

export function getReviewTreeFolderForRoot(): Promise<ReviewTreeFolderDto> {
	return invoke("get_review_tree_folder_for_root");
}
