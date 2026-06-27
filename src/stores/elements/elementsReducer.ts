import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import FolderNodeDto from "../../api/elements/dto/folderNodeDto";
import { ElementId } from "../../types/elements/elementId";

export interface ElementsState {
	tree: FolderNodeDto[];
	isLoading: boolean;
	error: string | null;
	selectedElementId: ElementId | null;
}

const initialState: ElementsState = {
	tree: [],
	isLoading: false,
	error: null,
	selectedElementId: null,
};

const elementsSlice = createSlice({
	name: "elements",
	initialState,
	reducers: {
		setTreeLoading: state => {
			state.isLoading = true;
			state.error = null;
		},
		setTree: (state, action: PayloadAction<FolderNodeDto[]>) => {
			state.tree = action.payload;
			state.isLoading = false;
			state.error = null;
		},
		setTreeError: (state, action: PayloadAction<string>) => {
			state.error = action.payload;
			state.isLoading = false;
		},
		clearTreeError: state => {
			state.error = null;
		},
		setSelectedElementId: (
			state,
			action: PayloadAction<ElementId | null>,
		) => {
			state.selectedElementId = action.payload;
		},
	},
});

export default elementsSlice.reducer;

export const {
	setTreeLoading,
	setTree,
	setTreeError,
	clearTreeError,
	setSelectedElementId,
} = elementsSlice.actions;
