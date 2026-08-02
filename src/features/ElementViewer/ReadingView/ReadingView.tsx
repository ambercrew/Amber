import { useCallback, useEffect, useRef, useState } from "react";
import { Center, Container, Loader } from "@mantine/core";
import { useWindowEvent } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { getReadingSplitManifest } from "../../../api/elements/api/elementsApi";
import { MetaResponseDto } from "../../../api/elements/dto/anyElementDto";
import { FloatingMenuItem } from "../../../components/Editor/plugins/FloatingMenuPlugin";
import { HighlightCreatedPayload } from "../../../components/Editor/plugins/HighlightPlugin/highlightCommands";
import { searchHighlightRegistry } from "../../../components/Editor/plugins/SearchHighlightPlugin/searchHighlightRegistry";
import useAppSelector from "../../../hooks/useAppSelector";
import {
	selectSearchCaseSensitive,
	selectSearchCurrentIndex,
	selectSearchQuery,
} from "../../../stores/search/searchSelectors";
import { ReadingSplitMetaDto } from "../../../types/elements/readingSplitMetaDto";
import { ReadPoint } from "../../../types/elements/readPoint";
import { READ_POINT_MANUAL_GOTO_REQUESTED } from "../../../types/events/readPointManualGotoRequestedEvent";
import ContentOriginPanel from "../ContentOriginPanel";
import { useSyncSearchMatches } from "../hooks/useSyncSearchMatches";
import SplitSlot from "./SplitSlot";
import {
	findNearestMatchAtOrBelowViewport,
	type MatchTarget as InitialMatchTarget,
} from "./findNearestMatchAtOrBelowViewport";
import { NO_READ_POINT, useReadPoint } from "./useReadPoint";
import { useReadPointScroll } from "./useReadPointScroll";
import { useReadingSearch, type MatchTarget } from "./useReadingSearch";
import { useSearchNavigation } from "./useSearchNavigation";
import { useSplitHeights } from "./heights/useSplitHeights";
import { useSplitMountWindow } from "./useSplitMountWindow";
import { READING_VIEWPORT_TOP_OFFSET_IN_PX } from "./readingViewConstants";

interface ReadingViewProps {
	readingId: string;
	readPoint: ReadPoint;
	meta: MetaResponseDto;
	buttons: FloatingMenuItem[];
	autoFocus?: boolean;
	onHighlightCreated?: (payload: HighlightCreatedPayload) => void;
}

/**
 * Renders a reading as a virtualized vertical stack of splits: a small window
 * of live Lexical editors around the viewport, cheap placeholders elsewhere.
 * Only a lightweight split index is fetched on open, never every split's
 * content. Relies on native scroll anchoring to keep visible content stable
 * as splits resize, with a manual fallback on engines that lack it.
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

	const { mountedSeqs, primarySeq, registerSlot, lockTo, unlock } =
		useSplitMountWindow({
			splits: splits ?? [],
			initialSeq: readPoint.split,
		});

	// The editable root of each mounted split, keyed by seq, so position math
	// reads block geometry through Lexical rather than querying the DOM.
	const contentRootsRef = useRef<Map<number, HTMLElement>>(new Map());
	const getContentRoot = useCallback(
		(seq: number) => contentRootsRef.current.get(seq),
		[],
	);

	// `restoredRef` is shared with the hook below: low until the saved read
	// point has been restored on open, so it can hold off scroll-tracking
	// until then.
	const { restoredRef, notifySplitReady, goToReadPoint } = useReadPointScroll(
		{
			initial: readPoint,
			getContentRoot,
			jumpTo: lockTo,
			releaseJump: unlock,
		},
	);
	const { getHeight, observeSplit } = useSplitHeights(
		readingId,
		contentWidth,
	);

	const searchQuery = useAppSelector(selectSearchQuery);
	const searchCaseSensitive = useAppSelector(selectSearchCaseSensitive);
	const searchCurrentIndex = useAppSelector(selectSearchCurrentIndex);
	const {
		onSplitMatches,
		totalMatches,
		countsBySeq,
		resolveMatchTarget,
		toGlobalIndex,
	} = useReadingSearch({
		readingId,
		splits: splits ?? [],
		query: searchQuery,
		caseSensitive: searchCaseSensitive,
		mountedSeqs,
	});
	const { goToMatch, notifySearchTargetReady } = useSearchNavigation({
		splits: splits ?? [],
		getContentRoot,
		getHeight,
		jumpTo: lockTo,
		releaseJump: unlock,
	});
	const handleSearchNavigate = useCallback(
		(target: MatchTarget) => goToMatch(target.seq, target.localIndex),
		[goToMatch],
	);
	const resolveLocalMatchAtOrBelow = useCallback((seq: number) => {
		const ranges = searchHighlightRegistry.getRanges(String(seq));
		if (!ranges) return null;
		const index = ranges.findIndex(
			range =>
				range.getBoundingClientRect().top >=
				READING_VIEWPORT_TOP_OFFSET_IN_PX,
		);
		return index === -1 ? null : index;
	}, []);
	const resolveInitialSearchIndex = useCallback(() => {
		const target: InitialMatchTarget | null =
			findNearestMatchAtOrBelowViewport(
				splits ?? [],
				countsBySeq,
				primarySeq,
				resolveLocalMatchAtOrBelow,
			);
		return target ? toGlobalIndex(target) : 0;
	}, [
		splits,
		countsBySeq,
		primarySeq,
		resolveLocalMatchAtOrBelow,
		toGlobalIndex,
	]);
	useSyncSearchMatches({
		totalMatches,
		resolveMatchTarget,
		onNavigate: handleSearchNavigate,
		resolveInitialIndex: resolveInitialSearchIndex,
	});
	const currentSearchTarget =
		searchCurrentIndex >= 0 ? resolveMatchTarget(searchCurrentIndex) : null;

	const [displayedReadPoint, setDisplayedReadPoint] = useState(readPoint);

	const { recordExtractReadPoint, trackCursor, getCurrentReadPoint } =
		useReadPoint({
			readingId,
			primarySeq,
			initial: readPoint,
			getContentRoot,
			lastSplitSeq: splits?.[splits.length - 1]?.seq,
			restoredRef,
			onReadPointChange: setDisplayedReadPoint,
		});

	const handleGoToReadPointRequested = useCallback(() => {
		const target = getCurrentReadPoint();
		if (
			target.split === NO_READ_POINT.split &&
			target.block === NO_READ_POINT.block
		) {
			notifications.show({ message: "No read point set" });
			return;
		}
		goToReadPoint(target);
	}, [getCurrentReadPoint, goToReadPoint]);
	useWindowEvent(
		READ_POINT_MANUAL_GOTO_REQUESTED,
		handleGoToReadPointRequested,
	);

	const handleHighlightCreated = useCallback(
		(payload: HighlightCreatedPayload, seq: number) => {
			onHighlightCreated?.(payload);
			recordExtractReadPoint(seq, payload.endBlockIndex);
		},
		[onHighlightCreated, recordExtractReadPoint],
	);

	// One-shot: left permanently on, re-mounting this split later (as the
	// mount window slides back over it) would re-focus its start and yank
	// the reader's scroll position via the browser's caret-follow.
	const [pendingAutoFocus, setPendingAutoFocus] = useState(!!autoFocus);
	const handleContentReady = useCallback(
		(seq: number) => {
			if (seq === readPoint.split) setPendingAutoFocus(false);
			notifySplitReady(seq);
			notifySearchTargetReady(seq);
		},
		[readPoint.split, notifySplitReady, notifySearchTargetReady],
	);

	// Cached per seq so the ref callback's identity is stable across renders
	// — otherwise React would detach/reattach every slot's ref (and its
	// IntersectionObserver registration) on every render.
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
							split.seq === displayedReadPoint.split &&
							(displayedReadPoint.split !== 0 ||
								displayedReadPoint.block !== 0)
								? displayedReadPoint.block
								: undefined
						}
						search={{
							editorKey: String(split.seq),
							query: searchQuery,
							caseSensitive: searchCaseSensitive,
							currentMatchLocalIndex:
								currentSearchTarget?.seq === split.seq
									? currentSearchTarget.localIndex
									: null,
							onMatches: onSplitMatches,
						}}
					/>
				))}
			<ContentOriginPanel meta={meta} />
		</Container>
	);
}
