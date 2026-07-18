/**
 * Per-reading cache of measured split heights in localStorage, so that the very
 * first paint of a reading is already close to its final layout (no scroll jump
 * as neighbours mount).
 */

const KEY_PREFIX = "splitHeights.";

function keyFor(readingId: string): string {
	return `${KEY_PREFIX}${readingId}`;
}

/** Loads cached heights for a reading, or an empty map if none are stored. */
export function loadSplitHeights(readingId: string): Record<number, number> {
	try {
		const raw = localStorage.getItem(keyFor(readingId));
		if (!raw) return {};
		return JSON.parse(raw) as Record<number, number>;
	} catch {
		return {};
	}
}

export function saveSplitHeights(
	readingId: string,
	heights: Record<number, number>,
): void {
	try {
		localStorage.setItem(keyFor(readingId), JSON.stringify(heights));
	} catch {
		// Ignore quota / serialization failures — heights are a cache, not
		// source of truth, and will simply be re-measured next session.
	}
}

/** Deletes the whole cache entry for a reading (e.g. when it is deleted). */
export function clearSplitHeights(readingId: string): void {
	try {
		localStorage.removeItem(keyFor(readingId));
	} catch {
		// Ignore.
	}
}
