import { getUserInformation, login as loginApi } from "../../api/authApi";
import errorToString from "../../utils/errorToString";
import { AppDispatch, RootState } from "../store";
import { loginFailure, loginSuccess, requestFailure, requestStart, requestSuccess } from "./userReducer";

export function login(username: string, password: string) {
    return executeRequest(async (dispatch) => {
        await loginApi(username, password);
        const userInformation = await getUserInformation();
        dispatch(loginSuccess({
            isSignedIn: true,
            userInformation,
        }));
    }, (e, dispatch) => dispatch(loginFailure(e)));
}

function executeRequest<T>(
    cb: (dispatch: AppDispatch, state: RootState) => Promise<T>,
    onError: (e: string, dispatch: AppDispatch, state: RootState) => void
) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
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
