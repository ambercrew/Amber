import { RootState } from "../store";

export const selectTrash = (state: RootState) => state.trash.items;
export const selectTrashError = (state: RootState) => state.trash.error;
export const selectTrashIsLoading = (state: RootState) => state.trash.isLoading;
