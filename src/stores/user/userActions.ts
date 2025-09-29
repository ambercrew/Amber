import { getUserInformation, login as loginApi, signup as signupApi } from "../../api/authApi";
import errorToString from "../../utils/errorToString";
import { AppDispatch, RootState } from "../store";
import {
	loginFailure,
	loginSuccess,
	requestFailure,
	requestStart,
	requestSuccess,
    signupFailure,
} from "./userReducer";

export function login(username: string, password: string) {
	return executeRequest(
		async dispatch => {
			await loginApi(username, password);
			const userInformation = await getUserInformation();
			dispatch(
				loginSuccess(userInformation),
			);
		},
		(e, dispatch) => dispatch(loginFailure(e)),
	);
}

export function signup(
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
) {
	return executeRequest(
		async dispatch => {
			await signupApi(username, password, email, firstName, lastName);
			const userInformation = await getUserInformation();
			dispatch(
				loginSuccess(userInformation),
			);
		},
		(e, dispatch) => dispatch(signupFailure(e)),
	);
}

function executeRequest<T>(
	cb: (dispatch: AppDispatch, state: RootState) => Promise<T>,
	onError: (e: string, dispatch: AppDispatch, state: RootState) => void,
) {
	return async function (dispatch: AppDispatch, getState: () => RootState) {
		try {
			dispatch(requestStart());
			await cb(dispatch, getState());
			dispatch(requestSuccess());
		} catch (e) {
			dispatch(requestFailure());
			console.error(e);
			onError(errorToString(e), dispatch, getState());
		}
	};
}
