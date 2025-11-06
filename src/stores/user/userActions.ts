import { isSignedIn as isSignedInApi } from "../../api/authApi";
import { getUserInformation } from "../../api/userApi";
import { UserInformationDto } from "../../types/backend/dto/userInformnationDto";
import { AppDispatch } from "../store";
import { setUserInformation } from "./userReducer";

export function loadInitialStateUser() {
	return async function (
		dispatch: AppDispatch,
	): Promise<UserInformationDto | null> {
		try {
			const isSignedIn = await isSignedInApi();
			if (!isSignedIn) return null;
			const userInformation = await getUserInformation();
			dispatch(setUserInformation(userInformation));
			return userInformation;
		} catch (e) {
			console.error(e);
			return null;
		}
	};
}
