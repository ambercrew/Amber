import CardNodeDto from "../../api/elements/dto/cardNodeDto";
import ExtractNodeDto from "../../api/elements/dto/extractNodeDto";
import FolderNodeDto from "../../api/elements/dto/folderNodeDto";
import ReadingNodeDto from "../../api/elements/dto/readingNodeDto";
import { createSelector } from "@reduxjs/toolkit";
import { ElementId } from "../../types/elements/elementId";
import { RootState } from "../store";

export interface PathItem {
	id: ElementId;
	name: string;
}

export const selectElementTree = (state: RootState) => state.elements.tree;
export const selectElementTreeIsLoading = (state: RootState) =>
	state.elements.isLoading;
export const selectElementTreeError = (state: RootState) =>
	state.elements.error;
export const selectSelectedElementId = (state: RootState) =>
	state.elements.selectedElementId;

export const selectElementPath = createSelector(
	[selectElementTree, selectSelectedElementId],
	(tree, selected) => {
		if (!selected) return [];
		return findInFolders(tree, selected, []) ?? [];
	},
);

function findInFolders(
	folders: FolderNodeDto[],
	target: ElementId,
	path: PathItem[],
): PathItem[] | null {
	for (const folder of folders) {
		const next = [
			...path,
			{
				id: { type: "folder" as const, id: folder.id },
				name: folder.name,
			},
		];
		if (target.type === "folder" && folder.id === target.id) return next;
		const found =
			findInFolders(folder.folders, target, next) ??
			findInReadings(folder.readings, target, next) ??
			findInExtracts(folder.extracts, target, next) ??
			findInCards(folder.cards, target, next);
		if (found) return found;
	}
	return null;
}

function findInReadings(
	readings: ReadingNodeDto[],
	target: ElementId,
	path: PathItem[],
): PathItem[] | null {
	for (const reading of readings) {
		const next = [
			...path,
			{
				id: { type: "reading" as const, id: reading.id },
				name: reading.name,
			},
		];
		if (target.type === "reading" && reading.id === target.id) return next;
		const found =
			findInExtracts(reading.extracts, target, next) ??
			findInCards(reading.cards, target, next);
		if (found) return found;
	}
	return null;
}

function findInExtracts(
	extracts: ExtractNodeDto[],
	target: ElementId,
	path: PathItem[],
): PathItem[] | null {
	for (const extract of extracts) {
		const next = [
			...path,
			{
				id: { type: "extract" as const, id: extract.id },
				name: extract.name,
			},
		];
		if (target.type === "extract" && extract.id === target.id) return next;
		const found =
			findInExtracts(extract.extracts, target, next) ??
			findInCards(extract.cards, target, next);
		if (found) return found;
	}
	return null;
}

function findInCards(
	cards: CardNodeDto[],
	target: ElementId,
	path: PathItem[],
): PathItem[] | null {
	for (const card of cards) {
		if (target.type === "card" && card.id === target.id)
			return [
				...path,
				{ id: { type: "card", id: card.id }, name: card.name },
			];
	}
	return null;
}
