import { useCallback, useState } from "react";

export interface MatchTarget {
	editorKey: string;
	localIndex: number;
}

interface ReturnValue {
	/** Reports one editor's own, authoritative match count. */
	onMatches: (editorKey: string, count: number) => void;
	/** Total matches across every editor in `editorKeys`. */
	totalMatches: number;
	/** Resolves a global match index to the editor (and local index within it) that owns it. */
	resolveMatchTarget: (globalIndex: number) => MatchTarget | null;
}

/**
 * Aggregates find-in-page match counts across a small, fixed, always-mounted
 * set of editors (an extract's editor, or a card's front/back) in
 * `editorKeys` order.
 */
export function useSingleEditorSearch(editorKeys: string[]): ReturnValue {
	const [countsById, setCountsById] = useState<Map<string, number>>(
		new Map(),
	);
	// A stable key for `editorKeys`, since callers may pass a fresh array
	// literal each render.
	const editorKeysKey = editorKeys.join(",");

	const onMatches = useCallback((editorKey: string, count: number) => {
		setCountsById(prev => {
			if (prev.get(editorKey) === count) return prev;
			const next = new Map(prev);
			next.set(editorKey, count);
			return next;
		});
	}, []);

	const totalMatches = editorKeys.reduce(
		(sum, editorKey) => sum + (countsById.get(editorKey) ?? 0),
		0,
	);

	const resolveMatchTarget = useCallback(
		(globalIndex: number): MatchTarget | null => {
			if (globalIndex < 0) return null;
			let remaining = globalIndex;
			for (const editorKey of editorKeys) {
				const count = countsById.get(editorKey) ?? 0;
				if (remaining < count)
					return { editorKey, localIndex: remaining };
				remaining -= count;
			}
			return null;
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps -- editorKeysKey stands in for editorKeys
		[editorKeysKey, countsById],
	);

	return { onMatches, totalMatches, resolveMatchTarget };
}
