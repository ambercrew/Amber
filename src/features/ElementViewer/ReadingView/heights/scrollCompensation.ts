import { READING_VIEWPORT_TOP_OFFSET_IN_PX } from "../readingViewConstants";

/**
 * Manual fallback for browsers without native scroll anchoring. Adjusts
 * scroll position by the same delta a resizing element grew/shrank by, so
 * content the reader is already looking at doesn't jump. Skipped while the
 * element is still visible, since compensating there would itself yank the
 * viewport away from what's shown.
 */
export function compensateScrollForResize(
	element: HTMLElement,
	prevHeight: number,
	newHeight: number,
) {
	const delta = newHeight - prevHeight;
	if (delta === 0) return;

	const rect = element.getBoundingClientRect();
	if (rect.top > READING_VIEWPORT_TOP_OFFSET_IN_PX) return;

	window.scrollBy(0, delta);
}
