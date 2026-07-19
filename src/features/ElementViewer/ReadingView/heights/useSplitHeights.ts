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
	 * after it unmounts — and the first paint next session — match exactly. This
	 * only catches resizes React doesn't drive (Lexical edits, image loads); the
	 * mount-time placeholder-to-content swap is recorded elsewhere via
	 * `reportHeight`. Native scroll anchoring (see `ReadingView.tsx`) is what
	 * keeps the visible content stable across either kind of resize — this hook
	 * only keeps the height cache accurate. The returned function is cached per
	 * seq, keeping a stable identity across renders (unless charCount changes)
	 * so callers don't detach/reattach the ref — and tear down the
	 * `ResizeObserver` — on every unrelated re-render.
	 */
	observeSplit: (
		seq: number,
		charCount: number,
	) => (element: HTMLElement | null) => void;
	/** Records a height measured by the caller. */
	reportHeight: (seq: number, height: number) => void;
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
	const refCallbacksRef = useRef<
		Map<
			number,
			{ charCount: number; fn: (element: HTMLElement | null) => void }
		>
	>(new Map());

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

	const reportHeight = useCallback(
		(seq: number, height: number) => {
			heightsRef.current[seq] = height;
			schedulePersist();
		},
		[schedulePersist],
	);

	// Cached per seq so the returned ref callback keeps the same identity
	// across renders (as long as charCount doesn't change) — otherwise a new
	// closure every render makes React detach/reattach the ref on every
	// re-render of the caller, tearing down and recreating the
	// ResizeObserver even though the DOM node never actually unmounted.
	const observeSplit = useCallback(
		(seq: number, charCount: number) => {
			const cached = refCallbacksRef.current.get(seq);
			if (cached?.charCount === charCount) return cached.fn;

			const fn = (element: HTMLElement | null) => {
				const existing = observersRef.current.get(seq);
				if (existing) {
					existing.disconnect();
					observersRef.current.delete(seq);
				}
				if (!element) return;

				const observer = new ResizeObserver(() => {
					const newHeight = element.offsetHeight;
					if (newHeight <= 0) return;
					if (getHeight(seq, charCount) === newHeight) return;

					heightsRef.current[seq] = newHeight;
					schedulePersist();
				});
				observer.observe(element);
				observersRef.current.set(seq, observer);
			};
			refCallbacksRef.current.set(seq, { charCount, fn });
			return fn;
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

	return { getHeight, observeSplit, reportHeight };
}
