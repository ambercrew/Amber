import { useEffect } from "react";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { setSearchMatchCounts } from "../../../stores/search/searchReducer";
import {
	selectSearchCurrentIndex,
	selectSearchOpened,
} from "../../../stores/search/searchSelectors";

interface Props<Target> {
	totalMatches: number;
	resolveMatchTarget: (globalIndex: number) => Target | null;
	onNavigate: (target: Target) => void;
	/** Computes the index to seed when there's no current match yet. */
	resolveInitialIndex: () => number;
}

/**
 * Keeps the `search` Redux slice's `totalMatches`/`currentIndex` in sync with
 * a surface's own match aggregation, and scrolls to the current match
 * whenever it changes. Shared by all three find-in-page surfaces (reading,
 * extract, card).
 */
export function useSyncSearchMatches<Target>({
	totalMatches,
	resolveMatchTarget,
	onNavigate,
	resolveInitialIndex,
}: Props<Target>): void {
	const dispatch = useAppDispatch();
	const opened = useAppSelector(selectSearchOpened);
	const reduxCurrentIndex = useAppSelector(selectSearchCurrentIndex);

	// Seeds `currentIndex` whenever there isn't one yet; otherwise just
	// re-clamps it. `reduxCurrentIndex` is read but not a dep, since including
	// it would fight `goToNextMatch`/`goToPreviousMatch`.
	useEffect(() => {
		if (!opened) return;

		const shouldSeed = reduxCurrentIndex < 0 && totalMatches > 0;
		const seededIndex = shouldSeed
			? resolveInitialIndex()
			: reduxCurrentIndex;

		const currentIndex =
			totalMatches === 0
				? -1
				: Math.min(Math.max(seededIndex, 0), totalMatches - 1);

		dispatch(setSearchMatchCounts({ currentIndex, totalMatches }));
		// eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above: reduxCurrentIndex/resolveInitialIndex are read, not depended on
	}, [dispatch, opened, totalMatches]);

	// Navigates whenever the current match index changes.
	useEffect(() => {
		if (!opened || reduxCurrentIndex < 0) return;
		const target = resolveMatchTarget(reduxCurrentIndex);
		if (target) onNavigate(target);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- resolveMatchTarget/onNavigate intentionally excluded to avoid re-navigating on every re-creation of these callbacks
	}, [opened, reduxCurrentIndex]);
}
