import { invoke } from "@tauri-apps/api/core";
import SettingsDto from "../types/backend/dto/settingsDto";
import UpdateSettingsRequest from "../types/backend/dto/updateSettingsRequest";

export function getSettings(): Promise<SettingsDto> {
	return invoke("get_settings");
}

export function updateSettings(
	updateSettingsRequest: UpdateSettingsRequest,
): Promise<void> {
	return invoke("update_settings", {
		newSettings: updateSettingsRequest,
	});
}
