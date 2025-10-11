import { invoke } from "@tauri-apps/api/core";

export function sync(
): Promise<void> {
	return invoke("sync");
}
