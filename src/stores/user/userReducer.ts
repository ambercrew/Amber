import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { UserInformationDto } from "../../types/backend/dto/userInformnationDto";

interface UserState {
	isSignedIn: boolean;
	loginError: string | null;
	userInformation: UserInformationDto | null;
	// TODO: use it with loading spinner
	isSendingRequest: boolean;
}

const initialState: UserState = {
	isSignedIn: false,
	loginError: null,
	userInformation: null,
	isSendingRequest: false,
};

interface LoginSuccessPayload {
	isSignedIn: boolean;
	userInformation: UserInformationDto | null;
}

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
		loginSuccess: (state, payload: PayloadAction<LoginSuccessPayload>) => {
			state.isSignedIn = payload.payload.isSignedIn;
			state.userInformation = payload.payload.userInformation;
		},
		loginFailure: (state, payload: PayloadAction<string>) => {
			state.loginError = payload.payload;
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
} = userSlice.actions;
