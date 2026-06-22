import { invoke } from "@tauri-apps/api/core";
import { PendingExtractDto } from "../dto/pendingExtractDto";
import { ExtractStatus } from "../entities/extract.";

export function getPendingExtractsWithContent(
	cellId: string,
): Promise<PendingExtractDto[]> {
	return invoke("get_pending_extracts_with_content", { cellId });
}

export function updateExtractStatus(
	extractId: string,
	status: ExtractStatus,
): Promise<void> {
	return invoke("update_extract_status", { extractId, status });
}

export function createClozeFromExtract(
	extractId: string,
	cellId: string,
	content: string,
): Promise<void> {
	return invoke("create_cloze_from_extract", { extractId, cellId, content });
}
