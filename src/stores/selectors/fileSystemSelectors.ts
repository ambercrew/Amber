import { createSelector } from "@reduxjs/toolkit";
import ParsedFile from "../../types/parsedFile";
import ParsedFolder from "../../types/parsedFolder";
import { RootState } from "../store";
import getFolderChildById from "../../utils/getFolderChildById";

export const selectError = (state: RootState) => state.fileSystem.error;

export const selectRootFolder = (state: RootState) =>
	state.fileSystem.rootFolder;

export const selectFileById = createSelector(
	[selectRootFolder, (_, id: number) => id],
	(rootFolder, id) => getFolderChildById(rootFolder, id) as ParsedFile | null,
);

export const selectFolderById = createSelector(
	[selectRootFolder, (_, id: number) => id],
	(rootFolder, id) =>
		getFolderChildById(rootFolder, id) as ParsedFolder | null,
);
