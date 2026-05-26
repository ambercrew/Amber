import { RootState } from "../store";

export const selectFocusedCellId = (state: RootState) => state.ai.focusedCellId;
