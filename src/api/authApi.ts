import { invoke } from "@tauri-apps/api/core";
import { UserInformationDto } from "../types/backend/dto/userInformnationDto";

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

export function getUserInformation(): Promise<UserInformationDto> {
	return invoke("get_user_information");
}

export function isSignedIn(): Promise<boolean> {
	return invoke("is_signed_in");
}

export function updateUserInformation(firstName: string | null, lastName: string | null): Promise<void> {
    return invoke("update_user_information", {firstName, lastName});
}
