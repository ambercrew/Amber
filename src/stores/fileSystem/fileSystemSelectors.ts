import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";
import getFolderChildById from "../../utils/getFolderChildById";

export const selectErrorMessage = (state: RootState) =>
	state.fileSystem.errorMessage;
export const selectSuccessMessage = (state: RootState) =>
	state.fileSystem.successMessage;

export const selectRootFolder = (state: RootState) =>
	state.fileSystem.rootFolder;

export const selectFileById = createSelector(
	[selectRootFolder, (_, id: string) => id],
	(rootFolder, id) => getFolderChildById(rootFolder, id),
);
