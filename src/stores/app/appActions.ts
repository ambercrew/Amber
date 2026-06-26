import { NavigateFunction } from "react-router";
import { loadAndApplySettings } from "../settings/settingsActions";
import { AppDispatch, RootState } from "../store";
import { sync } from "../sync/syncActions";
import { loadUserState } from "../user/userActions";
import { UserInformationDto } from "../../api/backend/dto/userInformationDto";
import { setUserInformation } from "../user/userReducer";
import { selectStartedInitialStateLoading } from "./appSelectors";
import { markStartLoadingOfInitialState } from "./appReducer";
import { loadElementTree } from "../elements/elementsActions";

export function initialLoadApplicationState() {
	return async function (
		dispatch: AppDispatch,
		getState: () => RootState,
	): Promise<void> {
		if (selectStartedInitialStateLoading(getState())) return;
		dispatch(markStartLoadingOfInitialState());
		await loadAppState(dispatch);
	};
}

/** A common action that reloads the application state,
 * as if you have refreshed the web page.*/
export function reloadApplicationState(
	navigate: NavigateFunction,
	userInformationDto?: UserInformationDto,
) {
	return async function (dispatch: AppDispatch): Promise<void> {
		await loadAppState(dispatch, navigate, userInformationDto);
	};
}

async function loadAppState(
	dispatch: AppDispatch,
	navigate?: NavigateFunction,
	userInformationDto?: UserInformationDto,
) {
	const settings = await dispatch(loadAndApplySettings());

	if (userInformationDto) {
		dispatch(setUserInformation(userInformationDto));
	} else {
		await dispatch(loadUserState());
	}

	// Sync on app close is added as an event in the settings actions.
	if (settings?.autoSync) await dispatch(sync());

	if (navigate) {
		await navigate("/");
	}

	await dispatch(loadElementTree());
}
