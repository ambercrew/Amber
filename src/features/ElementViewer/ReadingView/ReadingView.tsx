import { useCallback, useEffect, useRef, useState } from "react";
import { Center, Container, Loader } from "@mantine/core";
import { useWindowEvent } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { getReadingSplitManifest } from "../../../api/elements/api/elementsApi";
import { MetaResponseDto } from "../../../api/elements/dto/anyElementDto";
import { FloatingMenuItem } from "../../../components/Editor/plugins/FloatingMenuPlugin";
import { HighlightCreatedPayload } from "../../../components/Editor/plugins/HighlightPlugin/highlightCommands";
import { ReadingSplitMetaDto } from "../../../types/elements/readingSplitMetaDto";
import { ReadPoint } from "../../../types/elements/readPoint";
import { READ_POINT_MANUAL_GOTO_REQUESTED } from "../../../types/events/readPointManualGotoRequestedEvent";
import ContentSourcePanel from "../ContentSourcePanel";
import SplitSlot from "./SplitSlot";
import { scrollBlockIntoView } from "./scrollBlockIntoView";
import { NO_READ_POINT, useReadPoint } from "./useReadPoint";
import { useSplitHeights } from "./heights/useSplitHeights";
import { useSplitMountWindow } from "./useSplitMountWindow";

interface ReadingViewProps {
	readingId: string;
	readPoint: ReadPoint;
	meta: MetaResponseDto;
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
 * content stable as splits above the viewport resize. Engines that don't
 * support it (WebKitGTK, the Linux Tauri webview) fall back to manual
 * compensation — see `supportsOverflowAnchor` and `scrollCompensation.ts`.
 */
export default function ReadingView({
	readingId,
	readPoint,
	meta,
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

	// Shared latch: low until the saved read point has been restored on open.
	// The mount window stays pinned to the target split while it's low (see
	// `useSplitMountWindow`); `useReadPoint` flips it once restore anchors;
	// `useSplitHeights` uses it to hold off compensating for the target split's
	// own placeholder-to-content resize, which would otherwise double up with
	// the restore scroll into a much bigger jump.
	const restoredRef = useRef(false);
	const { getHeight, observeSplit } = useSplitHeights(
		readingId,
		contentWidth,
		restoredRef,
	);
	const { mountedSeqs, primarySeq, registerSlot, jumpTo, releaseJump } =
		useSplitMountWindow({
			splits: splits ?? [],
			initialSeq: readPoint.split,
		});

	// The editable root of each mounted split, keyed by seq. Registered by the
	// split's editor via `RootElementPlugin` (see `SplitSlot`), so position math
	// reads block geometry through Lexical rather than querying the DOM.
	const contentRootsRef = useRef<Map<number, HTMLElement>>(new Map());
	const getContentRoot = useCallback(
		(seq: number) => contentRootsRef.current.get(seq),
		[],
	);
	const {
		restoreIfTarget,
		recordExtractReadPoint,
		trackCursor,
		getCurrentReadPoint,
	} = useReadPoint({
		readingId,
		primarySeq,
		initial: readPoint,
		getContentRoot,
		lastSplitSeq: splits?.[splits.length - 1]?.seq,
		restoredRef,
		onRestored: releaseJump,
	});

	// Split/block of a "go to read point" request whose target split isn't
	// mounted yet, so the scroll can't happen until it becomes available.
	// Cleared once `handleContentReady` fires for that split.
	const pendingGotoRef = useRef<ReadPoint | null>(null);
	const goToReadPoint = useCallback(() => {
		const target = getCurrentReadPoint();
		if (
			target.split === NO_READ_POINT.split &&
			target.block === NO_READ_POINT.block
		) {
			notifications.show({ message: "No read point set" });
			return;
		}
		const root = getContentRoot(target.split);
		if (root) {
			scrollBlockIntoView(root, target.block);
			return;
		}
		// Not mounted — force it into the mount window so it renders a live
		// editor, then scroll to it precisely in `handleContentReady` once its
		// content is ready.
		pendingGotoRef.current = target;
		jumpTo(target.split);
	}, [getCurrentReadPoint, getContentRoot, jumpTo]);
	useWindowEvent(READ_POINT_MANUAL_GOTO_REQUESTED, goToReadPoint);

	const handleHighlightCreated = useCallback(
		(payload: HighlightCreatedPayload, seq: number) => {
			onHighlightCreated?.(payload);
			recordExtractReadPoint(seq, payload.endBlockIndex);
		},
		[onHighlightCreated, recordExtractReadPoint],
	);

	// Auto-focus is a one-shot grant for the read point split's first mount
	// after open. Left permanently on, every re-mount of that split (as the
	// virtualization window shifts back over it) would recreate its editor
	// with the AutoFocus extension active, focusing the caret at the editor's
	// start — and the browser scrolls the new caret into view, yanking the
	// reader to the top of that split mid-scroll.
	const [pendingAutoFocus, setPendingAutoFocus] = useState(!!autoFocus);
	const handleContentReady = useCallback(
		(seq: number) => {
			if (seq === readPoint.split) setPendingAutoFocus(false);
			restoreIfTarget(seq);
			if (pendingGotoRef.current?.split === seq) {
				const { block } = pendingGotoRef.current;
				pendingGotoRef.current = null;
				// Defer a frame so Lexical has painted the block rects (same
				// reasoning as `restoreIfTarget`) — otherwise a split that just
				// mounted from a placeholder scrolls to a stale position.
				requestAnimationFrame(() => {
					const root = getContentRoot(seq);
					if (root) scrollBlockIntoView(root, block);
					releaseJump();
				});
			}
		},
		[readPoint.split, restoreIfTarget, getContentRoot, releaseJump],
	);

	// Cached per seq so the returned ref callback keeps the same identity
	// across renders — otherwise a new closure every render (e.g. every time
	// `primarySeq` shifts while scrolling) makes React detach/reattach every
	// slot's ref, tearing down and recreating the IntersectionObserver's
	// registration for every split, not just the ones near the viewport.
	const slotRefsRef = useRef<Map<number, (element: Element | null) => void>>(
		new Map(),
	);
	const setSlotRef = useCallback(
		(seq: number) => {
			const cached = slotRefsRef.current.get(seq);
			if (cached) return cached;
			const fn = registerSlot(seq);
			slotRefsRef.current.set(seq, fn);
			return fn;
		},
		[registerSlot],
	);

	// Cached per seq for the same ref-identity reason as `setSlotRef`.
	const contentRootRefsRef = useRef<
		Map<number, (element: HTMLElement | null) => void>
	>(new Map());
	const registerContentRoot = useCallback((seq: number) => {
		const cached = contentRootRefsRef.current.get(seq);
		if (cached) return cached;
		const fn = (element: HTMLElement | null) => {
			if (element) contentRootsRef.current.set(seq, element);
			else contentRootsRef.current.delete(seq);
		};
		contentRootRefsRef.current.set(seq, fn);
		return fn;
	}, []);

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
				// eslint-disable-next-line react-hooks/refs
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
							pendingAutoFocus && split.seq === readPoint.split
						}
						slotRef={setSlotRef(split.seq)}
						observeSplit={observeSplit(split.seq, split.charCount)}
						registerContentRoot={registerContentRoot(split.seq)}
						onHighlightCreated={handleHighlightCreated}
						onContentReady={handleContentReady}
						onCursorMove={trackCursor}
						markerBlockIndex={
							split.seq === readPoint.split &&
							(readPoint.split !== 0 || readPoint.block !== 0)
								? readPoint.block
								: undefined
						}
					/>
				))}
			<ContentSourcePanel meta={meta} />
		</Container>
	);
}
