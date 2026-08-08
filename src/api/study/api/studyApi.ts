import { invoke } from "@tauri-apps/api/core";
import { ElementId } from "../../../types/elements/elementId";
import { Rating } from "../../../types/study/rating";
import { CardDuePreviewDto } from "../dto/cardDuePreviewDto";
import { CardReviewDto } from "../dto/cardReviewDto";
import { DueElementDto } from "../dto/dueElementDto";
import { ReadingReviewDto } from "../dto/readingReviewDto";

export function getDueElements(): Promise<DueElementDto[]> {
	return invoke("get_due_elements");
}

export function gradeCard(
	cardId: string,
	rating: Rating,
	durationMs: number | null,
): Promise<CardReviewDto> {
	return invoke("grade_card", { cardId, rating, durationMs });
}

export function previewCardReview(cardId: string): Promise<CardDuePreviewDto> {
	return invoke("preview_card_review", { cardId });
}

export function nextReading(elementId: ElementId): Promise<ReadingReviewDto> {
	return invoke("next_reading", { elementId });
}

export function previewNextReading(elementId: ElementId): Promise<string> {
	return invoke("preview_next_reading", { elementId });
}

export function finishReading(elementId: ElementId): Promise<ReadingReviewDto> {
	return invoke("finish_reading", { elementId });
}

export function unfinishReading(
	elementId: ElementId,
): Promise<ReadingReviewDto> {
	return invoke("unfinish_reading", { elementId });
}

export function getCardReview(cardId: string): Promise<CardReviewDto | null> {
	return invoke("get_card_review", { cardId });
}

export function getReadingReview(
	elementId: ElementId,
): Promise<ReadingReviewDto | null> {
	return invoke("get_reading_review", { elementId });
}
