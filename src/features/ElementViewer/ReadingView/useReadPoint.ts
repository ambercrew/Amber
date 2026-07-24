import { RefObject, useCallback, useEffect, useRef } from "react";
import { READING_VIEWPORT_TOP_OFFSET_IN_PX } from "./readingViewConstants";
import useAutoSave from "../hooks/useAutoSave";
import useApi from "../../../hooks/useApi";
import { updateReadPoint } from "../../../api/elements/api/elementsApi";
import { ReadPoint } from "../../../types/elements/readPoint";

interface Props {
	readingId: string;
	/** seq of the split currently at the top of the viewport. */
	primarySeq: number;
	/** Read point to restore to on open. */
	initial: ReadPoint;
	/** The editable root of the mounted split `seq`, whose children are its blocks. */
	getContentRoot: (seq: number) => HTMLElement | undefined;
	/**
	 * Flipped to `true` once restore has anchored the viewport. Shared with the
	 * mount window, which stays pinned to the target split until it flips — and
	 * gating saves off it prevents the restore scroll from being recorded as a
	 * user scroll back to the top.
	 */
	restoredRef: RefObject<boolean>;
}

interface ReturnValue {
	/**
	 * Called when a split's editor content has mounted. If it's the split we
	 * need to restore to, scrolls the target block to the top of the viewport.
	 */
	restoreIfTarget: (seq: number) => void;
}

/** Index of the first block whose bottom edge is still below the viewport top. */
function topVisibleBlockIndex(root: HTMLElement, topOffset: number): number {
	const blocks = root.children;
	for (let i = 0; i < blocks.length; i++) {
		if (blocks[i].getBoundingClientRect().bottom > topOffset + 1) return i;
	}
	return Math.max(0, blocks.length - 1);
}

/**
 * Restores the saved read point on open and persists it as the user
 * scrolls. Restore anchors to the actual mounted target block rather than an
 * absolute offset, so estimate error in the placeholders above never causes a
 * visible jump. Persistence goes through `useAutoSave`, so the latest read
 * point is also flushed on unmount, app close, and before a sync — not just
 * after the debounce settles.
 */
export function useReadPoint({
	readingId,
	primarySeq,
	initial,
	getContentRoot,
	restoredRef,
}: Props): ReturnValue {
	const lastSavedRef = useRef<ReadPoint>({
		split: initial.split,
		block: initial.block,
	});
	// Read the latest primary seq from inside the (stable) scroll handler.
	const primarySeqRef = useRef(primarySeq);
	useEffect(() => {
		primarySeqRef.current = primarySeq;
	}, [primarySeq]);

	const restoreIfTarget = useCallback(
		(seq: number) => {
			if (restoredRef.current || seq !== initial.split) return;
			// Defer a frame so Lexical has painted the block rects.
			requestAnimationFrame(() => {
				const root = getContentRoot(seq);
				const block = root
					? (root.children[initial.block] ??
						root.children[root.children.length - 1])
					: null;
				if (block) {
					block.scrollIntoView({ block: "start" });
					window.scrollBy(0, -READING_VIEWPORT_TOP_OFFSET_IN_PX);
				}
				// Always release the gate, even if the root wasn't found — a
				// permanently low flag would freeze the mount window on the
				// target split forever.
				restoredRef.current = true;
			});
		},
		[initial.split, initial.block, getContentRoot, restoredRef],
	);

	const { callApi } = useApi();
	const handleSave = useCallback(
		async (content: string) => {
			const readPoint = JSON.parse(content) as ReadPoint;
			const last = lastSavedRef.current;
			if (
				last.split === readPoint.split &&
				last.block === readPoint.block
			) {
				return;
			}
			lastSavedRef.current = readPoint;
			await updateReadPoint({ readingId, readPoint });
		},
		[readingId],
	);
	const { onContentUpdate } = useAutoSave({ onSave: handleSave, callApi });

	const recordReadPoint = useCallback(() => {
		// Don't record scrolling that happens before the restore has landed.
		if (!restoredRef.current) return;
		const seq = primarySeqRef.current;
		const root = getContentRoot(seq);
		if (!root) return;
		const block = topVisibleBlockIndex(
			root,
			READING_VIEWPORT_TOP_OFFSET_IN_PX,
		);
		// Capture the read point eagerly rather than letting useAutoSave read it
		// at flush time: on unmount the split editors tear down before this
		// hook's flush runs, so a deferred DOM read would find no root.
		// Serializing now lets useAutoSave persist this exact read point on
		// unmount / close / sync.
		const readPoint: ReadPoint = { split: seq, block };
		onContentUpdate(() => JSON.stringify(readPoint));
	}, [restoredRef, getContentRoot, onContentUpdate]);

	// Throttle to one measurement per frame — scroll fires far more often than
	// paints, and measuring a block's rect on every event is wasteful.
	useEffect(() => {
		let frame: number | null = null;
		const handler = () => {
			if (frame !== null) return;
			frame = requestAnimationFrame(() => {
				frame = null;
				recordReadPoint();
			});
		};
		window.addEventListener("scroll", handler, { passive: true });
		return () => {
			window.removeEventListener("scroll", handler);
			if (frame !== null) cancelAnimationFrame(frame);
		};
	}, [recordReadPoint]);

	return { restoreIfTarget };
}
