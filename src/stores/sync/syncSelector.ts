import { RootState } from "../store";

export const selectIsSyncing = (state: RootState) => state.sync.isSyncing;
