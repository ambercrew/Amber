import { useCallback, useEffect, useState } from "react";
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
	charCount: number;
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

/** Lazily loads and renders the live editor for one mounted split. */
function MountedSplit({
	readingId,
	seq,
	height,
	buttons,
	autoFocus,
	onHighlightCreated,
	onContentReady,
}: Omit<
	SplitSlotProps,
	| "splitNumber"
	| "isFirst"
	| "mounted"
	| "slotRef"
	| "observeSplit"
	| "charCount"
>) {
	const [content, setContent] = useState<string | null>(null);

	useEffect(() => {
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
	}, [readingId, seq]);

	useEffect(() => {
		if (content !== null) onContentReady(seq);
	}, [content, seq, onContentReady]);

	const handleChange = useCallback(
		async (updated: string) => {
			await updateReading({
				splitId: { readingId, seq },
				content: updated,
			});
		},
		[readingId, seq],
	);

	// Reserve the known height while the split's content is being fetched.
	if (content === null) return <SplitPlaceholder height={height} />;

	return (
		<ElementEditor
			initialContent={content}
			buttons={buttons}
			autoFocus={autoFocus}
			onChange={handleChange}
			onHighlightCreated={onHighlightCreated}
		/>
	);
}

/**
 * One split in the reading stack: a live editor when mounted, a cheap
 * placeholder otherwise. Renders a labeled divider at its top edge (every
 * split except the first) so the seam between Lexical instances is legible.
 */
export default function SplitSlot({
	splitNumber,
	isFirst,
	slotRef,
	observeSplit,
	mounted,
	charCount,
	...mountedProps
}: SplitSlotProps) {
	const { height } = mountedProps;

	// Measure only the swappable content box, not the (always-present) divider
	// above it — otherwise the divider's height would be cached as part of the
	// content height, then double-counted once that cached height is reused for
	// the placeholder box sitting next to a divider of its own.
	const setContentElement = useCallback(
		(element: HTMLDivElement | null) => {
			observeSplit(mounted ? element : null);
		},
		[observeSplit, mounted],
	);

	return (
		<div ref={slotRef} data-seq={mountedProps.seq}>
			{!isFirst && <Divider label={`Split ${splitNumber}`} my="lg" />}
			<div ref={setContentElement}>
				{mounted ? (
					<MountedSplit {...mountedProps} />
				) : (
					<SplitPlaceholder height={height} />
				)}
			</div>
		</div>
	);
}
