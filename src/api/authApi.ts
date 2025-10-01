import { invoke } from "@tauri-apps/api/core";

export function login(username: string, password: string): Promise<void> {
	return invoke("login", {
		username,
		password,
	});
}

export function signup(
	username: string,
	password: string,
	email: string,
	firstName: string,
	lastName: string,
): Promise<void> {
	return invoke("signup", {
		username,
		password,
		email,
		firstName,
		lastName,
	});
}

export function isSignedIn(): Promise<boolean> {
	return invoke("is_signed_in");
}
