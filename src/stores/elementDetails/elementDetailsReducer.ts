import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ElementDetailsResponseDto } from "../../api/elements/dto/elementDetailsDto";
import { ElementId } from "../../types/elements/elementId";

export interface ElementDetailsState {
	elementId: ElementId | null;
	details: ElementDetailsResponseDto | null;
	isLoading: boolean;
}

const initialState: ElementDetailsState = {
	elementId: null,
	details: null,
	isLoading: false,
};

const elementDetailsSlice = createSlice({
	name: "elementDetails",
	initialState,
	reducers: {
		setElementDetailsLoading: (state, action: PayloadAction<ElementId>) => {
			state.elementId = action.payload;
			state.isLoading = true;
		},
		setElementDetails: (
			state,
			action: PayloadAction<{
				elementId: ElementId;
				details: ElementDetailsResponseDto;
			}>,
		) => {
			state.elementId = action.payload.elementId;
			state.details = action.payload.details;
			state.isLoading = false;
		},
	},
});

export default elementDetailsSlice.reducer;

export const { setElementDetailsLoading, setElementDetails } =
	elementDetailsSlice.actions;
