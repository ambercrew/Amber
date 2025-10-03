import { invoke } from "@tauri-apps/api/core";

export function signIn(username: string, password: string): Promise<void> {
	return invoke("sign_in", {
		username,
		password,
	});
}

export function signUp(
	username: string,
	password: string,
	email: string,
	firstName: string,
	lastName: string,
): Promise<void> {
	return invoke("sign_up", {
		username,
		password,
		email,
		firstName,
		lastName,
	});
}

export function signOut(): Promise<boolean> {
	return invoke("sign_out");
}

export function isSignedIn(): Promise<boolean> {
	return invoke("is_signed_in");
}
