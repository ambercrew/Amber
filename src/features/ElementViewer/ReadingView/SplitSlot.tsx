import { useCallback, useEffect, useRef, useState } from "react";
import { Divider } from "@mantine/core";
import {
	getReadingSplitContent,
	updateReading,
} from "../../../api/elements/api/elementsApi";
import { FloatingMenuItem } from "../../../components/Editor/plugins/FloatingMenuPlugin";
import { HighlightCreatedPayload } from "../../../components/Editor/plugins/HighlightPlugin/highlightCommands";
import ReadPointMenu from "../../../components/Editor/plugins/ReadPointMenu";
import ElementEditor from "../ElementEditor";
import SplitPlaceholder from "./SplitPlaceholder";

interface SplitSlotProps {
	readingId: string;
	seq: number;
	/** 1-based ordinal shown in the boundary gutter marker. */
	splitNumber: number;
	isFirst: boolean;
	mounted: boolean;
	/** Best-known height (px) for the placeholder state. */
	height: number;
	buttons: FloatingMenuItem[];
	autoFocus: boolean;
	/** Ref for the slot root (observed for viewport entry + slot lookup). */
	slotRef: (element: Element | null) => void;
	/** Ref for the mounted editor's measured element. */
	observeSplit: (element: HTMLElement | null) => void;
	/** Registers the mounted editor's root element for this split. */
	registerContentRoot: (element: HTMLElement | null) => void;
	onHighlightCreated?: (
		payload: HighlightCreatedPayload,
		seq: number,
	) => void;
	onContentReady: (seq: number) => void;
	/** Block index to mark as the reader's saved read point, if it's in this split. */
	markerBlockIndex?: number;
	/** Called with the block index containing the caret, whenever it moves in this split. */
	onCursorMove?: (seq: number, blockIndex: number) => void;
}

/**
 * One split in the reading stack: a live editor when mounted, a cheap
 * placeholder otherwise. Renders a labeled divider at its top edge (every
 * split except the first) so the seam between Lexical instances is legible.
 */
export default function SplitSlot({
	readingId,
	seq,
	splitNumber,
	isFirst,
	mounted,
	height,
	buttons,
	autoFocus,
	slotRef,
	observeSplit,
	registerContentRoot,
	onHighlightCreated,
	onContentReady,
	markerBlockIndex,
	onCursorMove,
}: SplitSlotProps) {
	const [content, setContent] = useState<string | null>(null);
	const contentElementRef = useRef<HTMLDivElement | null>(null);

	// Fetches once, the first time this slot enters the mount window. Kept on
	// later re-mounts instead of re-fetching, since local edits are already
	// persisted.
	useEffect(() => {
		if (!mounted || content !== null) return;
		let cancelled = false;
		void getReadingSplitContent({ readingId, seq })
			.then(loaded => {
				if (!cancelled) setContent(loaded);
			})
			.catch(() => {
				if (!cancelled) setContent("");
			});
		return () => {
			cancelled = true;
		};
	}, [mounted, readingId, seq, content]);

	useEffect(() => {
		if (mounted && content !== null) onContentReady(seq);
	}, [mounted, content, seq, onContentReady]);

	const handleHighlightCreated = useCallback(
		(payload: HighlightCreatedPayload) =>
			onHighlightCreated?.(payload, seq),
		[onHighlightCreated, seq],
	);

	const handleCursorMove = useCallback(
		(blockIndex: number) => onCursorMove?.(seq, blockIndex),
		[onCursorMove, seq],
	);

	const handleChange = useCallback(
		async (updated: string) => {
			await updateReading({
				splitId: { readingId, seq },
				content: updated,
			});
		},
		[readingId, seq],
	);

	// Measure only the content box, not the divider above it, so its height
	// isn't double-counted when reused for the placeholder.
	const setContentElement = useCallback(
		(element: HTMLDivElement | null) => {
			contentElementRef.current = element;
			observeSplit(mounted ? element : null);
		},
		[observeSplit, mounted],
	);

	const showPlaceholder = !mounted || content === null;

	return (
		<div ref={slotRef} data-seq={seq}>
			{!isFirst && <Divider label={`Split ${splitNumber}`} my="lg" />}
			<div ref={setContentElement}>
				{showPlaceholder ? (
					<SplitPlaceholder height={height} />
				) : (
					<ElementEditor
						initialContent={content}
						buttons={buttons}
						autoFocus={autoFocus}
						onChange={handleChange}
						onHighlightCreated={handleHighlightCreated}
						onRootElement={registerContentRoot}
						markerBlockIndex={markerBlockIndex}
						onCursorMove={handleCursorMove}
						contextMenuItems={<ReadPointMenu />}
					/>
				)}
			</div>
		</div>
	);
}
