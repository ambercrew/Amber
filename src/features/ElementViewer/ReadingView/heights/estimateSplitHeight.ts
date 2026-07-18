import {
	READING_ESTIMATE_CHAR_AREA_IN_PX,
	READING_ESTIMATE_SCALE,
	READING_SPLIT_MIN_HEIGHT_IN_PX,
} from "../readingViewConstants";

/**
 * Rough height (px) for a split we haven't measured yet, from its stored content
 * length. Taller when there is more content; shorter when the column is wider
 * (more characters fit per line). This is only a first-paint placeholder — a
 * `ResizeObserver` replaces it with the real height once the split mounts.
 */
export function estimateSplitHeight(
	charCount: number,
	contentWidth: number,
): number {
	const width = contentWidth > 0 ? contentWidth : 1;
	const raw =
		(charCount *
			READING_ESTIMATE_CHAR_AREA_IN_PX *
			READING_ESTIMATE_SCALE) /
		width;
	return Math.max(READING_SPLIT_MIN_HEIGHT_IN_PX, Math.round(raw));
}
