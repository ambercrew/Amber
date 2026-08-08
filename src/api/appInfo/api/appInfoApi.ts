import { invoke } from "@tauri-apps/api/core";

export function isStoreInstalled(): Promise<boolean> {
	return invoke("is_store_installed");
}
