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
	onHighlightCreated?: (payload: HighlightCreatedPayload) => void;
	onContentReady: (seq: number) => void;
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
	onHighlightCreated,
	onContentReady,
}: SplitSlotProps) {
	const [content, setContent] = useState<string | null>(null);
	const contentElementRef = useRef<HTMLDivElement | null>(null);

	// Re-fetches whenever this slot re-enters the mount window. Stale content
	// from a previous mount is left in state rather than cleared — it renders
	// only while `mounted`, and is virtually always identical to what's
	// re-fetched (any local edit was already persisted via `handleChange`), so
	// keeping it just avoids a pointless flash back to the placeholder.
	useEffect(() => {
		if (!mounted) return;
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
	}, [mounted, readingId, seq]);

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
					/>
				)}
			</div>
		</div>
	);
}
