import { invoke } from "@tauri-apps/api/core";
import FileRepetitionCounts from "../valueObjects/fileRepetitionCounts";

export function getStudyRepetitionCounts(
	fileId: string,
): Promise<FileRepetitionCounts> {
	return invoke("get_study_repetition_counts", {
		fileId,
	});
}

export function resetRepetitionsForCell(cellId: string) {
	return invoke("reset_repetitions_for_cell", { cellId });
}
