import { DialogFilter } from "@tauri-apps/plugin-dialog";

export const jsonFileFilter: DialogFilter = {
	name: "*.json",
	extensions: ["json"],
};

export const dragFormatForFolder = "brainy/folderpath";
export const dragFormatForFile = "brainy/filepath";
