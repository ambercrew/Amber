import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { UserInformationDto } from "../../types/backend/dto/userInformnationDto";

interface UserState {
	isSignedIn: boolean;
	userInformation: UserInformationDto | null;
}

const initialState: UserState = {
	isSignedIn: false,
	userInformation: null,
};

export const userSlice = createSlice({
	name: "user",
	initialState,
	reducers: {
		setUserInformation: (
			state,
			payload: PayloadAction<UserInformationDto>,
		) => {
			state.isSignedIn = true;
			state.userInformation = payload.payload;
		},
		setLoggedOf: state => {
			state.isSignedIn = false;
			state.userInformation = null;
		},
	},
});

export default userSlice.reducer;

export const { setUserInformation, setLoggedOf } = userSlice.actions;
