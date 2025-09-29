import { invoke } from "@tauri-apps/api/core";
import { UserInformationDto } from "../types/backend/dto/userInformnationDto";

export function login(username: string, password: string): Promise<void> {
	return invoke("login", {
        username, password
	});
}

export function getUserInformation(): Promise<UserInformationDto> {
	return invoke("get_user_information");
}
