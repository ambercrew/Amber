import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { UserInformationDto } from "../../types/backend/dto/userInformnationDto";

interface UserState {
	isSignedIn: boolean;
	loginError: string | null;
	signupError: string | null;
	userInformation: UserInformationDto | null;
	// TODO: use it with loading spinner
	isSendingRequest: boolean;
}

const initialState: UserState = {
	isSignedIn: false,
	loginError: null,
	signupError: null,
	userInformation: null,
	isSendingRequest: false,
};

export const userSlice = createSlice({
	name: "user",
	initialState,
	reducers: {
		requestStart: state => {
			state.loginError = null;
			state.isSendingRequest = true;
		},
		requestSuccess: state => {
			state.loginError = null;
			state.isSendingRequest = false;
		},
		requestFailure: state => {
			state.isSendingRequest = false;
		},
		loginSuccess: (state, payload: PayloadAction<UserInformationDto>) => {
			state.isSignedIn = true;
			state.userInformation = payload.payload;
		},
		loginFailure: (state, payload: PayloadAction<string>) => {
			state.loginError = payload.payload;
		},
		signupFailure: (state, payload: PayloadAction<string>) => {
			state.signupError = payload.payload;
		},
	},
});

export default userSlice.reducer;

export const {
	requestStart,
	loginSuccess,
	requestSuccess,
	loginFailure,
	requestFailure,
	signupFailure,
} = userSlice.actions;
