import { invoke } from "@tauri-apps/api/core";

export function exportFolder(folderId: string, exportPath: string) {
	return invoke("export_folder", {
		folderId,
		exportPath,
	});
}

export function exportFile(fileId: string, exportPath: string) {
	return invoke("export_file", {
		fileId,
		exportPath,
	});
}

export function importFile(importItemPath: string, importIntoFolderId: string) {
	return invoke("import", {
		importItemPath,
		importIntoFolderId,
	});
}
