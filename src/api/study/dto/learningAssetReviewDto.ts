import { ElementId } from "../../../types/elements/elementId";

export interface LearningAssetReviewDto {
	elementId: ElementId;
	due: string;
	intervalDays: number;
	lastReviewed: string | null;
	finishedAt: string | null;
}
