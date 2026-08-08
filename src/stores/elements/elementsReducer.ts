import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AnyElementDto } from "../../api/elements/dto/anyElementDto";
import { NodeDto } from "../../api/elements/dto/nodeDto";

export interface ElementsState {
	tree: NodeDto[];
	isLoading: boolean;
	error: string | null;
	currentElement: AnyElementDto | null;
}

const initialState: ElementsState = {
	tree: [],
	isLoading: false,
	error: null,
	currentElement: null,
};

const elementsSlice = createSlice({
	name: "elements",
	initialState,
	reducers: {
		setTreeLoading: state => {
			state.isLoading = true;
			state.error = null;
		},
		setTree: (state, action: PayloadAction<NodeDto[]>) => {
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
		setCurrentElement: (
			state,
			action: PayloadAction<AnyElementDto | null>,
		) => {
			state.currentElement = action.payload;
		},
	},
});

export default elementsSlice.reducer;

export const {
	setTreeLoading,
	setTree,
	setTreeError,
	clearTreeError,
	setCurrentElement,
} = elementsSlice.actions;
