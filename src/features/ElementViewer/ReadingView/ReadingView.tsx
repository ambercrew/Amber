import { useCallback, useEffect, useRef, useState } from "react";
import { Center, Container, Loader } from "@mantine/core";
import { getReadingSplitManifest } from "../../../api/elements/api/elementsApi";
import { FloatingMenuItem } from "../../../components/Editor/plugins/FloatingMenuPlugin";
import { HighlightCreatedPayload } from "../../../components/Editor/plugins/HighlightPlugin/highlightCommands";
import { ReadingSplitMetaDto } from "../../../types/elements/readingSplitMetaDto";
import SplitSlot from "./SplitSlot";
import { useReadingPosition } from "./useReadingPosition";
import { useSplitHeights } from "./heights/useSplitHeights";
import { useSplitMountWindow } from "./useSplitMountWindow";

interface ReadingViewProps {
	readingId: string;
	position: { positionSplit: number; positionBlock: number };
	buttons: FloatingMenuItem[];
	autoFocus?: boolean;
	onHighlightCreated?: (payload: HighlightCreatedPayload) => void;
}

/**
 * Renders a reading as a virtualized vertical stack of splits: a small window of
 * live Lexical editors around the viewport, cheap placeholders elsewhere.
 * Content and layout are loaded lazily — only a lightweight split index is
 * fetched on open, never every split's content. Relies on the browser's
 * native scroll anchoring (`overflow-anchor`, on by default) to keep visible
 * content stable as splits above the viewport resize — do not disable it here.
 */
export default function ReadingView({
	readingId,
	position,
	buttons,
	autoFocus,
	onHighlightCreated,
}: ReadingViewProps) {
	const [contentWidth, setContentWidth] = useState(0);
	// A callback ref (rather than an effect keyed on mount) so the width is
	// measured whenever this node actually attaches — including the first
	// render once `splits` finishes loading and the container appears.
	const containerRef = useCallback((node: HTMLDivElement | null) => {
		if (!node) return;
		// Round to reduce cache churn from sub-pixel / scrollbar variance.
		setContentWidth(Math.round(node.clientWidth / 10) * 10);
	}, []);

	const [splits, setSplits] = useState<ReadingSplitMetaDto[] | null>(null);
	useEffect(() => {
		let cancelled = false;
		void getReadingSplitManifest(readingId)
			.then(manifest => {
				if (!cancelled) setSplits(manifest);
			})
			.catch(() => {
				if (!cancelled) setSplits([]);
			});
		return () => {
			cancelled = true;
		};
	}, [readingId]);

	const { getHeight, observeSplit } = useSplitHeights(
		readingId,
		contentWidth,
	);
	const { mountedSeqs, primarySeq, registerSlot } = useSplitMountWindow({
		splits: splits ?? [],
		initialSeq: position.positionSplit,
	});

	const slotElementsRef = useRef<Map<number, HTMLElement>>(new Map());
	const getSlotElement = useCallback(
		(seq: number) => slotElementsRef.current.get(seq),
		[],
	);
	const { restoreIfTarget } = useReadingPosition({
		readingId,
		primarySeq,
		initial: position,
		getSlotElement,
	});

	// Auto-focus is a one-shot grant for the position split's first mount
	// after open. Left permanently on, every re-mount of that split (as the
	// virtualization window shifts back over it) would recreate its editor
	// with the AutoFocus extension active, focusing the caret at the editor's
	// start — and the browser scrolls the new caret into view, yanking the
	// reader to the top of that split mid-scroll.
	const [pendingAutoFocus, setPendingAutoFocus] = useState(!!autoFocus);
	const handleContentReady = useCallback(
		(seq: number) => {
			if (seq === position.positionSplit) setPendingAutoFocus(false);
			restoreIfTarget(seq);
		},
		[position.positionSplit, restoreIfTarget],
	);

	const setSlotRef = useCallback(
		(seq: number) => (element: Element | null) => {
			registerSlot(seq)(element);
			if (element)
				slotElementsRef.current.set(seq, element as HTMLElement);
			else slotElementsRef.current.delete(seq);
		},
		[registerSlot],
	);

	if (!splits) {
		return (
			<Center py="xl">
				<Loader />
			</Center>
		);
	}

	return (
		<Container ref={containerRef} size="sm" py="lg">
			{contentWidth > 0 &&
				splits.map((split, index) => (
					<SplitSlot
						key={split.seq}
						readingId={readingId}
						seq={split.seq}
						splitNumber={index + 1}
						isFirst={index === 0}
						mounted={mountedSeqs.has(split.seq)}
						height={getHeight(split.seq, split.charCount)}
						buttons={buttons}
						autoFocus={
							pendingAutoFocus &&
							split.seq === position.positionSplit
						}
						slotRef={setSlotRef(split.seq)}
						observeSplit={observeSplit(split.seq, split.charCount)}
						onHighlightCreated={onHighlightCreated}
						onContentReady={handleContentReady}
					/>
				))}
		</Container>
	);
}
