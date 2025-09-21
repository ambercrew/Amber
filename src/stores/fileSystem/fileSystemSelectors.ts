import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import getFolderChildById from "../../utils/getFolderChildById";
import {
	ReviewTreeFile,
	ReviewTreeFolder,
} from "../../types/backend/dto/reviewTreeFolder";

export const selectError = (state: RootState) => state.fileSystem.error;

export const selectRootFolder = (state: RootState) =>
	state.fileSystem.rootFolder;

export const selectFileById = createSelector(
	[selectRootFolder, (_, id: string) => id],
	(rootFolder, id) =>
		getFolderChildById(rootFolder, id) as ReviewTreeFile | null,
);

export const selectFolderById = createSelector(
	[selectRootFolder, (_, id: string) => id],
	(rootFolder, id) =>
		getFolderChildById(rootFolder, id) as ReviewTreeFolder | null,
);
