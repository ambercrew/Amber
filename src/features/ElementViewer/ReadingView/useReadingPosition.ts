import { RefObject, useCallback, useEffect, useRef } from "react";
import { READING_VIEWPORT_TOP_OFFSET_IN_PX } from "./readingViewConstants";
import useAutoSave from "../hooks/useAutoSave";
import useApi from "../../../hooks/useApi";
import { updateReadingPosition } from "../../../api/elements/api/elementsApi";
import { ReadingPosition } from "../../../types/elements/readingPosition";

interface Props {
	readingId: string;
	/** seq of the split currently at the top of the viewport. */
	primarySeq: number;
	/** Position to restore to on open. */
	initial: ReadingPosition;
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
 * Restores the saved reading position on open and persists it as the user
 * scrolls. Restore anchors to the actual mounted target block rather than an
 * absolute offset, so estimate error in the placeholders above never causes a
 * visible jump. Persistence goes through `useAutoSave`, so the latest position
 * is also flushed on unmount, app close, and before a sync — not just after the
 * debounce settles.
 */
export function useReadingPosition({
	readingId,
	primarySeq,
	initial,
	getContentRoot,
	restoredRef,
}: Props): ReturnValue {
	const lastSavedRef = useRef<ReadingPosition>({
		positionSplit: initial.positionSplit,
		positionBlock: initial.positionBlock,
	});
	// Read the latest primary seq from inside the (stable) scroll handler.
	const primarySeqRef = useRef(primarySeq);
	useEffect(() => {
		primarySeqRef.current = primarySeq;
	}, [primarySeq]);

	const restoreIfTarget = useCallback(
		(seq: number) => {
			if (restoredRef.current || seq !== initial.positionSplit) return;
			// Defer a frame so Lexical has painted the block rects.
			requestAnimationFrame(() => {
				const root = getContentRoot(seq);
				const block = root
					? (root.children[initial.positionBlock] ??
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
		[
			initial.positionSplit,
			initial.positionBlock,
			getContentRoot,
			restoredRef,
		],
	);

	const { callApi } = useApi();
	const handleSave = useCallback(
		async (content: string) => {
			const position = JSON.parse(content) as ReadingPosition;
			const last = lastSavedRef.current;
			if (
				last.positionSplit === position.positionSplit &&
				last.positionBlock === position.positionBlock
			) {
				return;
			}
			lastSavedRef.current = position;
			await updateReadingPosition({ readingId, position });
		},
		[readingId],
	);
	const { onContentUpdate } = useAutoSave({ onSave: handleSave, callApi });

	const recordPosition = useCallback(() => {
		// Don't record scrolling that happens before the restore has landed.
		if (!restoredRef.current) return;
		const seq = primarySeqRef.current;
		const root = getContentRoot(seq);
		if (!root) return;
		const positionBlock = topVisibleBlockIndex(
			root,
			READING_VIEWPORT_TOP_OFFSET_IN_PX,
		);
		// Capture the position eagerly rather than letting useAutoSave read it at
		// flush time: on unmount the split editors tear down before this hook's
		// flush runs, so a deferred DOM read would find no root. Serializing now
		// lets useAutoSave persist this exact position on unmount / close / sync.
		const position: ReadingPosition = { positionSplit: seq, positionBlock };
		onContentUpdate(() => JSON.stringify(position));
	}, [restoredRef, getContentRoot, onContentUpdate]);

	// Throttle to one measurement per frame — scroll fires far more often than
	// paints, and measuring a block's rect on every event is wasteful.
	useEffect(() => {
		let frame: number | null = null;
		const handler = () => {
			if (frame !== null) return;
			frame = requestAnimationFrame(() => {
				frame = null;
				recordPosition();
			});
		};
		window.addEventListener("scroll", handler, { passive: true });
		return () => {
			window.removeEventListener("scroll", handler);
			if (frame !== null) cancelAnimationFrame(frame);
		};
	}, [recordPosition]);

	return { restoreIfTarget };
}
