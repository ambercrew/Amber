import { useCallback, useEffect, useRef, useState } from "react";
import { Divider } from "@mantine/core";
import {
	getReadingSplitContent,
	updateReading,
} from "../../../api/elements/api/elementsApi";
import { FloatingMenuItem } from "../../../components/Editor/plugins/FloatingMenuPlugin";
import { HighlightCreatedPayload } from "../../../components/Editor/plugins/HighlightPlugin/highlightCommands";
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
	onHighlightCreated?: (payload: HighlightCreatedPayload) => void;
	onContentReady: (seq: number) => void;
	/** Block index to mark as the reader's saved read point, if it's in this split. */
	markerBlockIndex?: number;
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
}: SplitSlotProps) {
	const [content, setContent] = useState<string | null>(null);
	const contentElementRef = useRef<HTMLDivElement | null>(null);

	// Fetches once, the first time this slot enters the mount window. Content
	// already loaded from an earlier mount is kept rather than re-fetched —
	// any local edit was already persisted via `handleChange`, so a re-fetch
	// would just be an identical, redundant IPC round-trip every time the
	// window slides back over this split.
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

	const handleChange = useCallback(
		async (updated: string) => {
			await updateReading({
				splitId: { readingId, seq },
				content: updated,
			});
		},
		[readingId, seq],
	);

	// Measure only the swappable content box, not the (always-present) divider
	// above it — otherwise the divider's height would be cached as part of the
	// content height, then double-counted once that cached height is reused for
	// the placeholder box sitting next to a divider of its own.
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
						onHighlightCreated={onHighlightCreated}
						onRootElement={registerContentRoot}
						markerBlockIndex={markerBlockIndex}
					/>
				)}
			</div>
		</div>
	);
}
