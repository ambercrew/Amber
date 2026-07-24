import { RefObject, useCallback, useEffect, useRef } from "react";
import { READING_HEIGHT_WRITE_DEBOUNCE_IN_MILLISECONDS } from "../readingViewConstants";
import { estimateSplitHeight } from "./estimateSplitHeight";
import { compensateScrollForResize } from "./scrollCompensation";
import { loadSplitHeights, saveSplitHeights } from "./splitHeightsStorage";
import { supportsOverflowAnchor } from "./supportsOverflowAnchor";

interface ReturnValue {
	/** Best-known height for a split: measured/stored, else an estimate. */
	getHeight: (seq: number, charCount: number) => number;
	/**
	 * Ref callback for a mounted split's root element. Measures its real height
	 * with a `ResizeObserver` (which reports once on the initial observe, so
	 * this also catches the mount-time placeholder-to-content swap, not just
	 * later resizes) and caches it debounced, so the placeholder shown after it
	 * unmounts matches exactly. Native scroll anchoring keeps visible content
	 * stable across the resize on engines that support it; on ones that don't,
	 * this hook manually compensates the scroll position instead. Cached per
	 * seq so callers don't detach/reattach the ref on every unrelated re-render.
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
	/**
	 * Held low until the saved position has been restored. The target split's
	 * first real measurement — placeholder estimate vs. actual height — lands
	 * right as that restore is positioning the viewport, and compensating for
	 * it on top of the restore scroll would double up into a much bigger jump
	 * than the estimate error alone; skip it until restore has landed.
	 */
	restoredRef?: RefObject<boolean>,
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
					const prevHeight = getHeight(seq, charCount);
					if (prevHeight === newHeight) return;

					if (
						!supportsOverflowAnchor() &&
						(!restoredRef || restoredRef.current)
					) {
						compensateScrollForResize(
							element,
							prevHeight,
							newHeight,
						);
					}

					heightsRef.current[seq] = newHeight;
					schedulePersist();
				});
				observer.observe(element);
				observersRef.current.set(seq, observer);
			};
			refCallbacksRef.current.set(seq, { charCount, fn });
			return fn;
		},
		[schedulePersist, getHeight, restoredRef],
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
