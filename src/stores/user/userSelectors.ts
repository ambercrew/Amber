import { RootState } from "../store";

export const selectIsSignedIn = (state: RootState) => state.user.isSignedIn;
export const selectLoginError = (state: RootState) => state.user.loginError;
export const selectSignupError = (state: RootState) => state.user.signupError;
