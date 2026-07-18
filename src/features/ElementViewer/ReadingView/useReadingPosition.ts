import { useCallback, useEffect, useRef } from "react";
import { useDebouncedCallback } from "@mantine/hooks";
import {
	READING_POSITION_WRITE_DEBOUNCE_IN_MILLISECONDS,
	READING_VIEWPORT_TOP_OFFSET_IN_PX,
} from "./readingViewConstants";
import { updateReadingPosition } from "../../../api/elements/api/elementsApi";

interface ReadingPosition {
	positionSplit: number;
	positionBlock: number;
}

interface Props {
	readingId: string;
	/** seq of the split currently at the top of the viewport. */
	primarySeq: number;
	/** Position to restore to on open. */
	initial: ReadingPosition;
	getSlotElement: (seq: number) => HTMLElement | undefined;
}

interface ReturnValue {
	/**
	 * Called when a split's editor content has mounted. If it's the split we
	 * need to restore to, scrolls the target block to the top of the viewport.
	 */
	restoreIfTarget: (seq: number) => void;
}

/** Lexical renders each top-level block as a direct child of the editable root. */
function contentRoot(slotElement: HTMLElement): HTMLElement | null {
	return slotElement.querySelector<HTMLElement>('[contenteditable="true"]');
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
 * Restores the saved reading position on open and persists it (debounced) as the
 * user scrolls. Restore anchors to the actual mounted target block rather than an
 * absolute offset, so estimate error in the placeholders above never causes a
 * visible jump.
 */
// TODO: review
export function useReadingPosition({
	readingId,
	primarySeq,
	initial,
	getSlotElement,
}: Props): ReturnValue {
	const restoredRef = useRef(false);
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
			const slotElement = getSlotElement(seq);
			if (!slotElement) return;
			// Defer a frame so Lexical has painted the block rects.
			requestAnimationFrame(() => {
				const root = contentRoot(slotElement);
				if (!root) return;
				const block =
					root.children[initial.positionBlock] ??
					root.children[root.children.length - 1];
				if (block) {
					block.scrollIntoView({ block: "start" });
					window.scrollBy(0, -READING_VIEWPORT_TOP_OFFSET_IN_PX);
				}
				restoredRef.current = true;
			});
		},
		[initial.positionSplit, initial.positionBlock, getSlotElement],
	);

	const savePosition = useDebouncedCallback(() => {
		// Don't record scrolling that happens before the restore has landed.
		if (!restoredRef.current) return;
		const seq = primarySeqRef.current;
		const slotElement = getSlotElement(seq);
		if (!slotElement) return;
		const root = contentRoot(slotElement);
		if (!root) return;

		const positionBlock = topVisibleBlockIndex(
			root,
			READING_VIEWPORT_TOP_OFFSET_IN_PX,
		);
		const last = lastSavedRef.current;
		if (
			last.positionSplit === seq &&
			last.positionBlock === positionBlock
		) {
			return;
		}
		lastSavedRef.current = { positionSplit: seq, positionBlock };
		void updateReadingPosition({
			readingId,
			positionSplit: seq,
			positionBlock,
		});
	}, READING_POSITION_WRITE_DEBOUNCE_IN_MILLISECONDS);

	useEffect(() => {
		const handler = () => savePosition();
		window.addEventListener("scroll", handler, { passive: true });
		return () => window.removeEventListener("scroll", handler);
	}, [savePosition]);

	return { restoreIfTarget };
}
