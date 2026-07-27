import { useCallback, useEffect, useRef, useState } from "react";
import { getReadingSplitTexts } from "../../../api/elements/api/elementsApi";
import { findMatches } from "../../../components/Editor/plugins/SearchHighlightPlugin/findMatches";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectSearchOpened } from "../../../stores/search/searchSelectors";
import { ReadingSplitMetaDto } from "../../../types/elements/readingSplitMetaDto";

interface Props {
	readingId: string;
	splits: ReadingSplitMetaDto[];
	query: string;
	caseSensitive: boolean;
	mountedSeqs: Set<number>;
}

export interface MatchTarget {
	seq: number;
	localIndex: number;
}

interface ReturnValue {
	/** Reports a mounted split's own, authoritative match count. */
	onSplitMatches: (splitId: string, count: number) => void;
	/** Total matches across every split, mounted or not. */
	totalMatches: number;
	/** Per-split match counts, in `splits` order — used for initial-result resolution. */
	countsBySeq: Map<number, number>;
	/** Resolves a global match index to the split (and local index within it) that owns it. */
	resolveMatchTarget: (globalIndex: number) => MatchTarget | null;
	/** Inverse of `resolveMatchTarget`: the global index of a given split + local index. */
	toGlobalIndex: (target: MatchTarget) => number;
}

/**
 * Aggregates find-in-page match counts across every split of a reading, not
 * just the mounted ones. Mounted splits report their own count live via
 * `onSplitMatches`; unmounted splits are counted from a plain-text snapshot
 * fetched once, lazily, the first time search opens.
 */
export function useReadingSearch({
	readingId,
	splits,
	query,
	caseSensitive,
	mountedSeqs,
}: Props): ReturnValue {
	const opened = useAppSelector(selectSearchOpened);
	const [countsBySeq, setCountsBySeq] = useState<Map<number, number>>(
		new Map(),
	);
	const splitTextsRef = useRef<Map<number, string> | null>(null);
	const splitTextsReadingIdRef = useRef<string | null>(null);

	// Fetched once, lazily, the first time search opens for this reading.
	useEffect(() => {
		if (!opened) return;
		if (splitTextsReadingIdRef.current === readingId) return;
		let cancelled = false;
		splitTextsReadingIdRef.current = readingId;
		void getReadingSplitTexts(readingId).then(texts => {
			if (cancelled) return;
			splitTextsRef.current = new Map(
				texts.map(({ seq, text }) => [seq, text]),
			);
		});
		return () => {
			cancelled = true;
		};
	}, [opened, readingId]);

	// Recomputes counts for unmounted splits when the query/case flag changes,
	// or a split leaves the mount window.
	useEffect(() => {
		setCountsBySeq(prev => {
			if (!query) return prev.size === 0 ? prev : new Map();
			const texts = splitTextsRef.current;
			if (!texts) return prev;
			const next = new Map(prev);
			for (const split of splits) {
				if (mountedSeqs.has(split.seq)) continue;
				const text = texts.get(split.seq) ?? "";
				next.set(
					split.seq,
					findMatches(text, query, caseSensitive).length,
				);
			}
			return next;
		});
	}, [splits, mountedSeqs, query, caseSensitive]);

	const onSplitMatches = useCallback((splitId: string, count: number) => {
		const seq = Number(splitId);
		setCountsBySeq(prev => {
			if (prev.get(seq) === count) return prev;
			const next = new Map(prev);
			next.set(seq, count);
			return next;
		});
	}, []);

	const totalMatches = splits.reduce(
		(sum, split) => sum + (countsBySeq.get(split.seq) ?? 0),
		0,
	);

	const resolveMatchTarget = useCallback(
		(globalIndex: number): MatchTarget | null => {
			if (globalIndex < 0) return null;
			let remaining = globalIndex;
			for (const split of splits) {
				const count = countsBySeq.get(split.seq) ?? 0;
				if (remaining < count) {
					return { seq: split.seq, localIndex: remaining };
				}
				remaining -= count;
			}
			return null;
		},
		[splits, countsBySeq],
	);

	const toGlobalIndex = useCallback(
		(target: MatchTarget): number => {
			let globalIndex = target.localIndex;
			for (const split of splits) {
				if (split.seq === target.seq) break;
				globalIndex += countsBySeq.get(split.seq) ?? 0;
			}
			return globalIndex;
		},
		[splits, countsBySeq],
	);

	return {
		onSplitMatches,
		totalMatches,
		countsBySeq,
		resolveMatchTarget,
		toGlobalIndex,
	};
}
