import { isSignedIn as isSignedInApi } from "../../api/authApi";
import { getUserInformation } from "../../api/userApi";
import { AppDispatch } from "../store";
import { setUserInformation } from "./userReducer";

export function loadInitialStateUser() {
	return async function (dispatch: AppDispatch): Promise<void> {
		try {
			const isSignedIn = await isSignedInApi();
			if (!isSignedIn) return;
			const userInformation = await getUserInformation();
			dispatch(setUserInformation(userInformation));
		} catch (e) {
			console.error(e);
		}
	};
}
