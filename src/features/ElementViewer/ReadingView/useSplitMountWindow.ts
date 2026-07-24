import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { READING_SPLIT_MOUNT_NEIGHBORS } from "./readingViewConstants";
import { ReadingSplitMetaDto } from "../../../types/elements/readingSplitMetaDto";

interface Props {
	splits: ReadingSplitMetaDto[];
	/** Split to mount initially, pinned there until released (see `jumpTo`/`releaseJump`). */
	initialSeq: number;
}

interface ReturnValue {
	/** seqs that should currently render a live editor. */
	mountedSeqs: Set<number>;
	/** seq of the split currently at the top of the viewport. */
	primarySeq: number;
	/** Ref callback for each slot's root element, observed for viewport entry. */
	registerSlot: (seq: number) => (element: Element | null) => void;
	/**
	 * Forces the mount window onto `seq`, for jumping to a split that isn't
	 * currently in the viewport (e.g. "go to read point"). Bypasses the
	 * viewport observer until `releaseJump` is called, so it isn't immediately
	 * overridden by the (still stale) actual scroll position.
	 */
	jumpTo: (seq: number) => void;
	/** Resumes viewport-observer-driven tracking after a `jumpTo`. */
	releaseJump: () => void;
}

/**
 * Decides which splits are live editors versus placeholders, from an
 * `IntersectionObserver` on every slot. The mounted set is the split at the top
 * of the viewport plus a fixed number of neighbours on each side, so it never
 * grows with the reading.
 */
export function useSplitMountWindow({
	splits,
	initialSeq,
}: Props): ReturnValue {
	const [primarySeq, setPrimarySeq] = useState(initialSeq);
	const intersectingRef = useRef<Set<number>>(new Set());
	const elementSeqRef = useRef<Map<Element, number>>(new Map());
	const observerRef = useRef<IntersectionObserver | null>(null);
	// Pinned from mount, so the window stays on `initialSeq` until the reader
	// (via `releaseJump`) says restore has anchored the viewport there —
	// otherwise, at open the viewport sits at the document top (scrollTop 0),
	// the observer reports the top-of-document splits as intersecting, and
	// the mount window collapses there, unmounting the target split before
	// restore can anchor to it. The same pin/release pair also backs `jumpTo`,
	// for forcing the window onto a split the viewport hasn't scrolled to yet
	// (e.g. "go to read point").
	const jumpingRef = useRef(true);

	useEffect(() => {
		const observer = new IntersectionObserver(
			entries => {
				for (const entry of entries) {
					const seq = elementSeqRef.current.get(entry.target);
					if (seq === undefined) continue;
					if (entry.isIntersecting) intersectingRef.current.add(seq);
					else intersectingRef.current.delete(seq);
				}
				if (intersectingRef.current.size === 0) return;
				if (jumpingRef.current) return;
				const topmost = Math.min(...intersectingRef.current);
				setPrimarySeq(prev => (prev === topmost ? prev : topmost));
			},
			// `root: null` = the scrolling viewport (the app window scrolls).
			{ root: null, threshold: 0 },
		);
		observerRef.current = observer;
		// Observe any slots whose refs were attached before this effect ran.
		elementSeqRef.current.forEach((_seq, element) =>
			observer.observe(element),
		);
		return () => {
			observer.disconnect();
			observerRef.current = null;
		};
	}, []);

	const registerSlot = useCallback(
		(seq: number) => (element: Element | null) => {
			const observer = observerRef.current;
			if (element) {
				elementSeqRef.current.set(element, seq);
				observer?.observe(element);
				return;
			}
			// Element detached: drop every mapping for this seq.
			for (const [key, value] of elementSeqRef.current) {
				if (value !== seq) continue;
				observer?.unobserve(key);
				elementSeqRef.current.delete(key);
			}
			intersectingRef.current.delete(seq);
		},
		[],
	);

	const mountedSeqs = useMemo(() => {
		const mounted = new Set<number>();
		const primaryIndex = splits.findIndex(
			split => split.seq === primarySeq,
		);
		const center = primaryIndex === -1 ? 0 : primaryIndex;
		for (
			let i = center - READING_SPLIT_MOUNT_NEIGHBORS;
			i <= center + READING_SPLIT_MOUNT_NEIGHBORS;
			i++
		) {
			if (i >= 0 && i < splits.length) mounted.add(splits[i].seq);
		}
		return mounted;
	}, [splits, primarySeq]);

	const jumpTo = useCallback((seq: number) => {
		jumpingRef.current = true;
		setPrimarySeq(seq);
	}, []);

	const releaseJump = useCallback(() => {
		jumpingRef.current = false;
	}, []);

	return { mountedSeqs, primarySeq, registerSlot, jumpTo, releaseJump };
}
