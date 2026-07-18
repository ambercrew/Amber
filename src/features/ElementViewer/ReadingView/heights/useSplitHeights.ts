import { useCallback, useEffect, useRef } from "react";
import { READING_HEIGHT_WRITE_DEBOUNCE_IN_MILLISECONDS } from "../readingViewConstants";
import { estimateSplitHeight } from "./estimateSplitHeight";
import { loadSplitHeights, saveSplitHeights } from "./splitHeightsStorage";

interface ReturnValue {
	/** Best-known height for a split: measured/stored, else an estimate. */
	getHeight: (seq: number, charCount: number) => number;
	/**
	 * Ref callback for a mounted split's root element. Measures its real height
	 * with a `ResizeObserver` and caches it (debounced) so the placeholder shown
	 * after it unmounts — and the first paint next session — match exactly. If
	 * the measured height differs from what was displayed (estimate or stale
	 * cache) while the split sits entirely above the viewport, compensates the
	 * scroll position so currently visible content doesn't jump.
	 */
	observeSplit: (
		seq: number,
		charCount: number,
	) => (element: HTMLElement | null) => void;
}

/**
 * Owns the in-memory split-height map for one reading, seeded from localStorage
 * and kept in sync as splits mount/measure. Heights live in a ref (not state):
 * they are read at render time by placeholders, and the transitions that reveal
 * placeholders (mount-window changes) already trigger re-renders, so measuring
 * never needs to force one of its own.
 */
export function useSplitHeights(
	readingId: string,
	contentWidth: number,
): ReturnValue {
	const heightsRef = useRef<Record<number, number>>({});
	const observersRef = useRef<Map<number, ResizeObserver>>(new Map());
	const persistTimeoutRef = useRef<number | null>(null);

	// Re-seed from storage whenever the reading changes.
	useEffect(() => {
		heightsRef.current = loadSplitHeights(readingId);
	}, [readingId]);

	const schedulePersist = useCallback(() => {
		if (persistTimeoutRef.current !== null) {
			clearTimeout(persistTimeoutRef.current);
		}
		persistTimeoutRef.current = window.setTimeout(() => {
			persistTimeoutRef.current = null;
			saveSplitHeights(readingId, heightsRef.current);
		}, READING_HEIGHT_WRITE_DEBOUNCE_IN_MILLISECONDS);
	}, [readingId]);

	const getHeight = useCallback(
		(seq: number, charCount: number) =>
			heightsRef.current[seq] ??
			estimateSplitHeight(charCount, contentWidth),
		[contentWidth],
	);

	const observeSplit = useCallback(
		(seq: number, charCount: number) => (element: HTMLElement | null) => {
			const existing = observersRef.current.get(seq);
			if (existing) {
				existing.disconnect();
				observersRef.current.delete(seq);
			}
			if (!element) return;

			const observer = new ResizeObserver(() => {
				const newHeight = element.offsetHeight;
				if (newHeight <= 0) return;
				const prevDisplayed = getHeight(seq, charCount);
				if (prevDisplayed === newHeight) return;

				// Already scrolled past this split (its bottom edge is above the
				// viewport) — a height change here would otherwise silently shift
				// everything below it, including whatever's currently visible.
				const rect = element.getBoundingClientRect();
				if (rect.bottom <= 0) {
					window.scrollBy(0, newHeight - prevDisplayed);
				}

				heightsRef.current[seq] = newHeight;
				schedulePersist();
			});
			observer.observe(element);
			observersRef.current.set(seq, observer);
		},
		[schedulePersist, getHeight],
	);

	// Tear down observers and flush any pending write on unmount.
	useEffect(() => {
		const observers = observersRef.current;
		return () => {
			observers.forEach(observer => observer.disconnect());
			observers.clear();
			if (persistTimeoutRef.current !== null) {
				clearTimeout(persistTimeoutRef.current);
			}
		};
	}, []);

	return { getHeight, observeSplit };
}
