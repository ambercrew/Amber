import { invoke } from "@tauri-apps/api/core";
import { UserInformationDto } from "../types/backend/dto/userInformationDto";

export function getUserInformation(): Promise<UserInformationDto> {
	return invoke("get_user_information");
}

export function updateUserInformation(
	firstName: string | null,
	lastName: string | null,
): Promise<void> {
	return invoke("update_user_information", { firstName, lastName });
}
