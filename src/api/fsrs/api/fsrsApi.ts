import { invoke } from "@tauri-apps/api/core";
import FsrsProfile from "../entities/fsrsProfile";
import CreateProfileRequestDto from "../dto/createProfileRequestDto";

export function getAllFsrsProfiles(): Promise<FsrsProfile[]> {
	return invoke("get_all_fsrs_profiles");
}

export function getFileFsrsProfile(id: string): Promise<FsrsProfile> {
	return invoke("get_file_fsrs_profile", { id });
}

export function createProfile(
	request: CreateProfileRequestDto,
): Promise<FsrsProfile> {
	return invoke("create_profile", { request });
}

export function updateProfile(profile: FsrsProfile): Promise<void> {
	return invoke("update_profile", { ...profile });
}

export function deleteFsrsProfile(id: string): Promise<void> {
	return invoke("delete_fsrs_profile", { id });
}
