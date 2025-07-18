import { invoke } from "@tauri-apps/api/core";
import Settings from "../types/backend/model/settings";
import UpdateSettingsRequest from "../types/backend/dto/updateSettingsRequest";

export function getSettings(): Promise<Settings> {
	return invoke("get_settings");
}

export function updateSettings(
	updateSettingsRequest: UpdateSettingsRequest,
): Promise<void> {
	return invoke("update_settings", {
		newSettings: updateSettingsRequest,
	});
}
