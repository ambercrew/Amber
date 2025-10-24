import { AppDispatch } from "../store";
import { sync as syncApi } from "../../api/syncApi";
import errorToString from "../../utils/errorToString";
import { setIsSyncing } from "./syncReducer";
import { defaultGlobalSyncEvenetManager } from "./manager/syncEventManager";

export function sync() {
	return async function (dispatch: AppDispatch) {
		try {
			dispatch(setIsSyncing(true));
			await defaultGlobalSyncEvenetManager.notifyPreSync();
			await syncApi();
			await defaultGlobalSyncEvenetManager.notifyPostSync();
		} catch (e) {
			console.error(e);
			alert(errorToString(e));
		} finally {
			dispatch(setIsSyncing(false));
		}
	};
}
