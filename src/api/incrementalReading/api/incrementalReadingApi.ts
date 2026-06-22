import { invoke } from "@tauri-apps/api/core";
import IncrementalReadingSchedule from "../entities/incrementalReadingSchedule";
import DueIncrementalReadingDto from "../dto/dueIncrementalReadingDto";
import CellWithPendingExtractsDto from "../dto/cellWithPendingExtractsDto";

export function getDueIncrementalReadings(): Promise<
	DueIncrementalReadingDto[]
> {
	return invoke("get_due_incremental_readings");
}

export function getCellsWithPendingExtracts(): Promise<
	CellWithPendingExtractsDto[]
> {
	return invoke("get_cells_with_pending_extracts");
}

export function getIncrementalReadingSchedule(
	cellId: string,
): Promise<IncrementalReadingSchedule | null> {
	return invoke("get_incremental_reading_schedule", { cellId });
}

export function getPendingExtractsCount(cellId: string): Promise<number> {
	return invoke("get_pending_extracts_count", { cellId });
}

export function scheduleIncrementalReadingLater(
	cellId: string,
	nextReadingDate: Date,
): Promise<void> {
	return invoke("schedule_incremental_reading_later", {
		cellId,
		nextReadingDate: nextReadingDate.toISOString(),
	});
}
