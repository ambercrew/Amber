import { invoke } from "@tauri-apps/api/core";
import FsrsProfile from "../entities/fsrsProfile";
import { FsrsProfileChoice } from "../../fileSystem/valueObjects/fsrsProfileChoice";
import CreateProfileRequestDto from "../dto/createProfileRequestDto";

export function getAllFsrsProfiles(): Promise<FsrsProfile[]> {
	return invoke("get_all_fsrs_profiles");
}

export function getFileFsrsProfile(id: string): Promise<FsrsProfile> {
	return invoke("get_file_fsrs_profile", { id });
}

export function getFolderFsrsProfile(id: string): Promise<FsrsProfile> {
	return invoke("get_folder_fsrs_profile", { id });
}

export function getParentFsrsProfileForFile(id: string): Promise<FsrsProfile> {
	return invoke("get_parent_fsrs_profile_for_file", { id });
}

export function getParentFsrsProfileForFolder(
	id: string,
): Promise<FsrsProfile> {
	return invoke("get_parent_fsrs_profile_for_folder", { id });
}

export function getFsrsProfileChoiceForFolder(
	id: string,
): Promise<FsrsProfileChoice> {
	return invoke("get_fsrs_profile_choice_for_folder", { id });
}

export function getFsrsProfileChoiceForFile(
	id: string,
): Promise<FsrsProfileChoice> {
	return invoke("get_fsrs_profile_choice_for_file", { id });
}

export function setFsrsProfileChoiceForFile(
	id: string,
	fsrsProfileChoice: FsrsProfileChoice,
): Promise<void> {
	return invoke("set_fsrs_profile_choice_for_file", {
		id,
		fsrsProfileChoice,
	});
}

export function setFsrsProfileChoiceForFolder(
	id: string,
	fsrsProfileChoice: FsrsProfileChoice,
): Promise<void> {
	return invoke("set_fsrs_profile_choice_for_folder", {
		id,
		fsrsProfileChoice,
	});
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
