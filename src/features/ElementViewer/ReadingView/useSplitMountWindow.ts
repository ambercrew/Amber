import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { READING_SPLIT_MOUNT_NEIGHBORS } from "./readingViewConstants";
import { ReadingSplitMetaDto } from "../../../types/elements/readingSplitMetaDto";

interface Props {
	splits: ReadingSplitMetaDto[];
	/** Split to treat as primary before the observer reports anything (restore). */
	initialSeq: number;
}

interface ReturnValue {
	/** seqs that should currently render a live editor. */
	mountedSeqs: Set<number>;
	/** seq of the split currently at the top of the viewport. */
	primarySeq: number;
	/** Ref callback for each slot's root element, observed for viewport entry. */
	registerSlot: (seq: number) => (element: Element | null) => void;
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

	return { mountedSeqs, primarySeq, registerSlot };
}
