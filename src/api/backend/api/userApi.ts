import { invoke } from "@tauri-apps/api/core";
import { UserInformationDto } from "../dto/userInformationDto";

export function getUserInformation(): Promise<UserInformationDto> {
	return invoke("get_user_information");
}

export function updateUserInformation(
	firstName: string | null,
	lastName: string | null,
): Promise<void> {
	return invoke("update_user_information", { firstName, lastName });
}

export function deleteUser(): Promise<void> {
	return invoke("delete_user");
}
