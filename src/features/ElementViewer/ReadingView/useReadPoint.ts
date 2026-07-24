import { RefObject, useCallback, useEffect, useRef } from "react";
import { useWindowEvent } from "@mantine/hooks";
import { READING_VIEWPORT_TOP_OFFSET_IN_PX } from "./readingViewConstants";
import useAutoSave from "../hooks/useAutoSave";
import useApi from "../../../hooks/useApi";
import { updateReadPoint } from "../../../api/elements/api/elementsApi";
import { ReadPoint } from "../../../types/elements/readPoint";
import { READ_POINT_MANUAL_SET_REQUESTED } from "../../../types/events/readPointManualSetRequestedEvent";
import { READ_POINT_MANUAL_CLEAR_REQUESTED } from "../../../types/events/readPointManualClearRequestedEvent";

interface Props {
	readingId: string;
	/** seq of the split currently at the top of the viewport. */
	primarySeq: number;
	/** Read point to restore to on open. */
	initial: ReadPoint;
	/** The editable root of the mounted split `seq`, whose children are its blocks. */
	getContentRoot: (seq: number) => HTMLElement | undefined;
	/**
	 * Seq of the reading's last split, used to detect when the user has
	 * scrolled to the absolute end. Omitted while the split manifest hasn't
	 * loaded yet.
	 */
	lastSplitSeq?: number;
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
	/**
	 * Called when an extract or cloze is created in this reading, with the
	 * split and block right after the extracted range.
	 */
	recordExtractReadPoint: (seq: number, block: number) => void;
	/**
	 * Called whenever the caret moves within a split, so a manual set can use
	 * the last known caret position even after focus has moved elsewhere
	 * (e.g. to the command palette's search field).
	 */
	trackCursor: (seq: number, block: number) => void;
}

/** The sentinel value meaning "no read point" — also a reading's state before it has ever had one saved. */
const NO_READ_POINT: ReadPoint = { split: 0, block: 0 };

/** Index of the first block whose bottom edge is still below the viewport top. */
function topVisibleBlockIndex(root: HTMLElement, topOffset: number): number {
	const blocks = root.children;
	for (let i = 0; i < blocks.length; i++) {
		if (blocks[i].getBoundingClientRect().bottom > topOffset + 1) return i;
	}
	return Math.max(0, blocks.length - 1);
}

/** Whether the last block of the reading's last split is fully scrolled into view. */
function isAtDocumentEnd(root: HTMLElement): boolean {
	const lastBlock = root.children[root.children.length - 1];
	return (
		!!lastBlock &&
		lastBlock.getBoundingClientRect().bottom <= window.innerHeight
	);
}

/**
 * Restores the saved read point on open and persists it as the user
 * scrolls. Restore anchors to the actual mounted target block rather than an
 * absolute offset, so estimate error in the placeholders above never causes a
 * visible jump. Persistence goes through `useAutoSave`, so the latest read
 * point is also flushed on unmount, app close, and before a sync — not just
 * after the debounce settles.
 *
 * Three placement sources compete for the same read point, in priority
 * order: manual (a user command) beats extract/cloze creation, which beats
 * automatic scroll-tracking. Once either a manual or extract placement
 * happens, automatic tracking stops for the rest of this reading's opening —
 * it only resumes on the next open, from `initial`.
 */
export function useReadPoint({
	readingId,
	primarySeq,
	initial,
	getContentRoot,
	lastSplitSeq,
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

	// Last read point reported by `CursorTrackerPlugin` for any mounted
	// split. Lexical keeps this valid even after focus moves away from the
	// editor (e.g. to the command palette), unlike a live DOM selection
	// query, which would read whatever has focus at command time instead.
	const lastCursorRef = useRef<ReadPoint | null>(null);
	const trackCursor = useCallback((seq: number, block: number) => {
		lastCursorRef.current = { split: seq, block };
	}, []);

	// Tracks which mechanism currently owns the read point for this opening.
	// Higher-priority placements block lower-priority ones from overwriting
	// them again, but never the other way around.
	const precedenceRef = useRef<"automatic" | "extract" | "manual">(
		"automatic",
	);

	const restoreIfTarget = useCallback(
		(seq: number) => {
			if (restoredRef.current || seq !== initial.split) return;
			// Already at the very start of the reading — nothing to scroll to.
			if (
				initial.split === NO_READ_POINT.split &&
				initial.block === NO_READ_POINT.block
			) {
				restoredRef.current = true;
				return;
			}
			// Defer a frame so Lexical has painted the block rects.
			requestAnimationFrame(() => {
				const root = getContentRoot(seq);
				const block = root
					? (root.children[initial.block] ??
						root.children[root.children.length - 1])
					: null;
				if (block) {
					block.scrollIntoView({ block: "start" });
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

	// Capture the read point eagerly rather than letting useAutoSave read it
	// at flush time: on unmount the split editors tear down before this
	// hook's flush runs, so a deferred DOM read would find no root.
	// Serializing now lets useAutoSave persist this exact read point on
	// unmount / close / sync.
	const persistReadPoint = useCallback(
		(readPoint: ReadPoint) => {
			onContentUpdate(() => JSON.stringify(readPoint));
		},
		[onContentUpdate],
	);

	const recordReadPoint = useCallback(() => {
		// Don't record scrolling that happens before the restore has landed,
		// or once a manual/extract placement has taken over for this opening.
		if (!restoredRef.current || precedenceRef.current !== "automatic") {
			return;
		}
		const seq = primarySeqRef.current;
		const root = getContentRoot(seq);
		if (!root) return;
		// Reaching the end of the reading means there is nothing left to
		// resume from, so the read point clears instead of pointing at the
		// last block.
		if (seq === lastSplitSeq && isAtDocumentEnd(root)) {
			persistReadPoint(NO_READ_POINT);
			return;
		}
		const block = topVisibleBlockIndex(
			root,
			READING_VIEWPORT_TOP_OFFSET_IN_PX,
		);
		persistReadPoint({ split: seq, block });
	}, [restoredRef, getContentRoot, persistReadPoint, lastSplitSeq]);

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

	const recordExtractReadPoint = useCallback(
		(seq: number, block: number) => {
			// A manual placement is a deliberate bookmark; an extract created
			// afterward shouldn't relocate it.
			if (precedenceRef.current === "manual") return;
			precedenceRef.current = "extract";
			persistReadPoint({ split: seq, block });
		},
		[persistReadPoint],
	);

	const recordManualReadPoint = useCallback(() => {
		precedenceRef.current = "manual";
		if (lastCursorRef.current) {
			persistReadPoint(lastCursorRef.current);
			return;
		}
		// No caret has been seen in any split yet — fall back to the block at
		// the top of the viewport.
		const seq = primarySeqRef.current;
		const root = getContentRoot(seq);
		if (!root) return;
		const block = topVisibleBlockIndex(
			root,
			READING_VIEWPORT_TOP_OFFSET_IN_PX,
		);
		persistReadPoint({ split: seq, block });
	}, [getContentRoot, persistReadPoint]);

	const recordManualClearReadPoint = useCallback(() => {
		precedenceRef.current = "manual";
		persistReadPoint(NO_READ_POINT);
	}, [persistReadPoint]);

	useWindowEvent(READ_POINT_MANUAL_SET_REQUESTED, recordManualReadPoint);
	useWindowEvent(
		READ_POINT_MANUAL_CLEAR_REQUESTED,
		recordManualClearReadPoint,
	);

	return { restoreIfTarget, recordExtractReadPoint, trackCursor };
}
