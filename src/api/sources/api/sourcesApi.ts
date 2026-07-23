import { invoke } from "@tauri-apps/api/core";
import { ElementId } from "../../../types/elements/elementId";
import { SourceRequestDto, SourceResponseDto } from "../dto/sourceDto";

export function listSources(): Promise<SourceResponseDto[]> {
	return invoke("list_sources");
}

export function getSource(id: string): Promise<SourceResponseDto> {
	return invoke("get_source", { id });
}

export function createSource(
	dto: SourceRequestDto,
): Promise<SourceResponseDto> {
	return invoke("create_source", { dto });
}

export function updateSource(
	id: string,
	dto: SourceRequestDto,
): Promise<SourceResponseDto> {
	return invoke("update_source", { id, dto });
}

export function deleteSource(id: string): Promise<void> {
	return invoke("delete_source", { id });
}

export function assignSource(
	elementId: ElementId,
	sourceId: string | null,
): Promise<void> {
	return invoke("assign_source", { elementId, sourceId });
}
