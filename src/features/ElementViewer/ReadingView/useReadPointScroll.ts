import { RefObject, useCallback, useRef } from "react";
import { ReadPoint } from "../../../types/elements/readPoint";
import { NO_READ_POINT } from "./useReadPoint";
import { scrollBlockIntoView } from "./scrollBlockIntoView";

interface Props {
	/** Read point to restore to on open. */
	initial: ReadPoint;
	/** The editable root of the mounted split `seq`, whose children are its blocks. */
	getContentRoot: (seq: number) => HTMLElement | undefined;
	/** Forces a split into the mount window so `notifySplitReady` will eventually fire for it. */
	jumpTo: (seq: number) => void;
	/** Resumes viewport-observer-driven mount-window tracking after a jump. */
	releaseJump: () => void;
}

interface ReturnValue {
	/**
	 * Flipped to `true` once the initial restore has anchored the viewport (or
	 * had nothing to do). Shared with callers that must hold off some behavior
	 * until then.
	 */
	restoredRef: RefObject<boolean>;
	/**
	 * Called when a split's editor content has mounted. Runs whichever scroll
	 * (restore-on-open or a `goToReadPoint` jump) is currently waiting on that
	 * split, if any.
	 */
	notifySplitReady: (seq: number) => void;
	/**
	 * Scrolls to a read point, mounting its split first if it isn't already a
	 * live editor. `target` must be a real read point — callers are
	 * responsible for handling `NO_READ_POINT` themselves (e.g. showing a
	 * "nothing to go to" message) before calling this.
	 */
	goToReadPoint: (target: ReadPoint) => void;
}

interface PendingScroll {
	split: number;
	/** `null` means "just wait for readiness" — nothing to scroll to (the reading opened at its very start). */
	block: number | null;
	onDone: () => void;
}

/**
 * Scrolls to a read point — on open (restoring the saved position) or
 * on-demand ("go to read point"). Both wait for the target split to mount a
 * live editor before scrolling, since a placeholder hasn't laid out real
 * blocks yet, then defer a frame after that so Lexical has painted them —
 * without it, a split that just mounted scrolls to a stale position.
 */
export function useReadPointScroll({
	initial,
	getContentRoot,
	jumpTo,
	releaseJump,
}: Props): ReturnValue {
	const restoredRef = useRef(false);

	// Seeded with the saved read point, so restore runs without an explicit
	// `goToReadPoint` call — the mount window already starts pinned to this
	// split; this just waits for it to be ready.
	const pendingRef = useRef<PendingScroll | null>({
		split: initial.split,
		block:
			initial.split === NO_READ_POINT.split &&
			initial.block === NO_READ_POINT.block
				? null
				: initial.block,
		onDone: () => {
			restoredRef.current = true;
			releaseJump();
		},
	});

	const notifySplitReady = useCallback(
		(seq: number) => {
			const pending = pendingRef.current;
			if (pending?.split !== seq) return;
			pendingRef.current = null;
			const { block, onDone } = pending;
			if (block === null) {
				onDone();
				return;
			}
			requestAnimationFrame(() => {
				const root = getContentRoot(seq);
				if (root) scrollBlockIntoView(root, block);
				onDone();
			});
		},
		[getContentRoot],
	);

	const goToReadPoint = useCallback(
		(target: ReadPoint) => {
			const root = getContentRoot(target.split);
			if (root) {
				scrollBlockIntoView(root, target.block);
				return;
			}
			// Not mounted — force it into the mount window so it renders a live
			// editor, then scroll to it precisely once `notifySplitReady` fires
			// for it.
			pendingRef.current = {
				split: target.split,
				block: target.block,
				onDone: releaseJump,
			};
			jumpTo(target.split);
		},
		[getContentRoot, jumpTo, releaseJump],
	);

	return { restoredRef, notifySplitReady, goToReadPoint };
}
