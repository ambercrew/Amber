import { AppDispatch, RootState } from "../store";
import { sync as syncApi } from "../../api/syncApi";
import errorToString from "../../utils/errorToString";
import { setIsSyncing } from "./syncReducer";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "./managers/syncEventManager";
import { selectIsSignedIn, selectUserInformation } from "../user/userSelectors";

export function sync() {
	return async function (dispatch: AppDispatch, getState: () => RootState) {
		if (
			!selectIsSignedIn(getState()) ||
			!selectUserInformation(getState())?.isEmailVerified
		) {
			return;
		}

		try {
			await defaultGlobalSyncEventManager.notifyListeners(
				ListenerType.PreSyncStart,
			);
			dispatch(setIsSyncing(true));
			await syncApi();
		} catch (e) {
			console.error(e);
			alert(errorToString(e));
		} finally {
			await defaultGlobalSyncEventManager.notifyListeners(
				ListenerType.PreSyncComplete,
			);
			dispatch(setIsSyncing(false));
			await defaultGlobalSyncEventManager.notifyListeners(
				ListenerType.PostSyncComplete,
			);
		}
	};
}
