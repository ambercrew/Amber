import { invoke } from "@tauri-apps/api/core";
import { UserInformationDto } from "../types/backend/dto/userInformationDto";
import SignUpRequest from "../types/backend/dto/signUpRequest";

export function signIn(
	username: string,
	password: string,
): Promise<UserInformationDto> {
	return invoke("sign_in", {
		username,
		password,
	});
}

export function signUp(request: SignUpRequest): Promise<UserInformationDto> {
	return invoke("sign_up", {
		request,
	});
}

export function signOut(): Promise<boolean> {
	return invoke("sign_out");
}

export function isSignedIn(): Promise<boolean> {
	return invoke("is_signed_in");
}

export function verifyUserEmail(verificationCode: string): Promise<void> {
	return invoke("verify_user_email", { verificationCode });
}

export function resendEmailVerificationCode(): Promise<void> {
	return invoke("resend_email_verification_code");
}

export function updatePassword(
	oldPassword: string,
	newPassword: string,
): Promise<void> {
	return invoke("update_password", { oldPassword, newPassword });
}
