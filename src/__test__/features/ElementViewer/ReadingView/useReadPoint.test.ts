import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReadPoint } from "../../../../features/ElementViewer/ReadingView/useReadPoint";
import { AUTO_SAVE_DELAY_IN_MILLISECONDS } from "../../../../config/constants";
import { ReadPoint } from "../../../../types/elements/readPoint";
import { READ_POINT_MANUAL_SET_REQUESTED } from "../../../../types/events/readPointManualSetRequestedEvent";
import { READ_POINT_MANUAL_CLEAR_REQUESTED } from "../../../../types/events/readPointManualClearRequestedEvent";

const { updateReadPointMock } = vi.hoisted(() => ({
	updateReadPointMock: vi.fn(),
}));

vi.mock("../../../../api/elements/api/elementsApi", () => ({
	updateReadPoint: updateReadPointMock,
}));

// useAutoSave wires itself into the app-close and sync managers (both backed by
// Tauri) on mount. Stub them so the hook exercises only its save/flush logic.
vi.mock("../../../../managers/closeRequestedEventManager", () => ({
	defaultCloseRequestedEventManager: {
		addHandler: vi.fn(),
		removeHandler: vi.fn(),
	},
}));

vi.mock("../../../../stores/sync/managers/syncEventManager", () => ({
	defaultGlobalSyncEventManager: {
		addListener: vi.fn(),
		removeListener: vi.fn(),
	},
	ListenerType: {
		PreSyncStart: "PreSyncStart",
		PreSyncComplete: "PreSyncComplete",
	},
}));

/** A stand-in editable root with `blockCount` top-level block children. */
function makeRoot(blockCount: number): HTMLElement {
	const root = document.createElement("div");
	for (let i = 0; i < blockCount; i++) {
		root.appendChild(document.createElement("p"));
	}
	return root;
}

function rect(bottom: number): DOMRect {
	return {
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: 0,
		bottom,
		width: 0,
		height: 0,
		toJSON: () => ({}),
	} as DOMRect;
}

/** Sets each block's `getBoundingClientRect().bottom`, so the top-offset scan is
 * deterministic without a layout engine. */
function setBlockBottoms(root: HTMLElement, bottoms: number[]) {
	Array.from(root.children).forEach((child, i) => {
		child.getBoundingClientRect = () => rect(bottoms[i]);
	});
}

// Blocks 0–1 are scrolled above the viewport top (56px); block 2 is the first
// one still visible, so the saved `block` should be 2.
const BOTTOMS_TOP_VISIBLE_IS_TWO = [10, 10, 100, 100, 100];

function renderReadPoint(overrides: {
	root: HTMLElement | undefined;
	primarySeq: number;
	initial: ReadPoint;
	restoredRef: { current: boolean };
	readingId?: string;
	lastSplitSeq?: number;
}) {
	const {
		root,
		primarySeq,
		initial,
		restoredRef,
		readingId = "r1",
		lastSplitSeq,
	} = overrides;
	return renderHook(() =>
		useReadPoint({
			readingId,
			primarySeq,
			initial,
			getContentRoot: () => root,
			lastSplitSeq,
			restoredRef,
		}),
	);
}

describe("useReadPoint", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		updateReadPointMock.mockResolvedValue(undefined);
		window.scrollBy = vi.fn();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("Should not restore when the ready split is not the target split", () => {
		// Arrange

		const root = makeRoot(3);
		const scrollIntoView = vi.fn();
		(root.children[0] as HTMLElement).scrollIntoView = scrollIntoView;
		const restoredRef = { current: false };
		const { result } = renderReadPoint({
			root,
			primarySeq: 2,
			initial: { split: 2, block: 0 },
			restoredRef,
		});

		// Act

		act(() => {
			result.current.restoreIfTarget(1);
			vi.runAllTimers();
		});

		// Assert

		expect(scrollIntoView).not.toHaveBeenCalled();
		expect(restoredRef.current).toBe(false);
	});

	it("Should scroll the saved block into view and mark restored when the target split is ready", () => {
		// Arrange

		const root = makeRoot(5);
		const scrollIntoView = vi.fn();
		(root.children[2] as HTMLElement).scrollIntoView = scrollIntoView;
		const restoredRef = { current: false };
		const { result } = renderReadPoint({
			root,
			primarySeq: 3,
			initial: { split: 3, block: 2 },
			restoredRef,
		});

		// Act

		act(() => {
			result.current.restoreIfTarget(3);
			vi.runAllTimers();
		});

		// Assert

		expect(scrollIntoView).toHaveBeenCalledWith({
			block: "start",
		});
		expect(restoredRef.current).toBe(true);
	});

	it("Should restore only once when the target split becomes ready again", () => {
		// Arrange

		const root = makeRoot(5);
		const scrollIntoView = vi.fn();
		(root.children[2] as HTMLElement).scrollIntoView = scrollIntoView;
		const restoredRef = { current: false };
		const { result } = renderReadPoint({
			root,
			primarySeq: 3,
			initial: { split: 3, block: 2 },
			restoredRef,
		});

		// Act

		act(() => {
			result.current.restoreIfTarget(3);
			vi.runAllTimers();
		});
		act(() => {
			result.current.restoreIfTarget(3);
			vi.runAllTimers();
		});

		// Assert

		expect(scrollIntoView).toHaveBeenCalledTimes(1);
	});

	it("Should not scroll and should mark restored when the saved read point is the very start", () => {
		// Arrange

		const root = makeRoot(3);
		const scrollIntoView = vi.fn();
		(root.children[0] as HTMLElement).scrollIntoView = scrollIntoView;
		const restoredRef = { current: false };
		const { result } = renderReadPoint({
			root,
			primarySeq: 0,
			initial: { split: 0, block: 0 },
			restoredRef,
		});

		// Act

		act(() => {
			result.current.restoreIfTarget(0);
			vi.runAllTimers();
		});

		// Assert

		expect(scrollIntoView).not.toHaveBeenCalled();
		expect(restoredRef.current).toBe(true);
	});

	it("Should not persist the read point on scroll before restore has landed", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: false };
		renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 0 },
			restoredRef,
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).not.toHaveBeenCalled();
	});

	it("Should persist the top visible block after scrolling once restored", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 0 },
			restoredRef,
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).toHaveBeenCalledWith({
			readingId: "r1",
			readPoint: { split: 4, block: 2 },
		});
	});

	it("Should clear the read point when scrolling reaches the absolute end of the last split", () => {
		// Arrange

		const root = makeRoot(5);
		// The last block's bottom edge (100) is within the viewport
		// (jsdom's default window.innerHeight is 768), so the reader has
		// scrolled all the way to the end of this, the reading's last split.
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 0 },
			restoredRef,
			lastSplitSeq: 4,
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).toHaveBeenCalledWith({
			readingId: "r1",
			readPoint: { split: 0, block: 0 },
		});
	});

	it("Should not clear when the primary split is not the reading's last split", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 0 },
			restoredRef,
			lastSplitSeq: 5,
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).toHaveBeenCalledWith({
			readingId: "r1",
			readPoint: { split: 4, block: 2 },
		});
	});

	it("Should not persist a read point identical to the last saved one", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		renderReadPoint({
			root,
			primarySeq: 4,
			// Last-saved is seeded from `initial`, and the scroll resolves to
			// block 2 as well, so there is nothing new to write.
			initial: { split: 4, block: 2 },
			restoredRef,
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).not.toHaveBeenCalled();
	});

	it("Should flush the pending read point when unmounting before the debounce fires", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		const { unmount } = renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 0 },
			restoredRef,
		});

		// Act

		// Run the scroll's rAF (records the read point) but not the autosave debounce.
		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.advanceTimersByTime(20);
		});
		const savedBeforeUnmount = updateReadPointMock.mock.calls.length;
		act(() => {
			unmount();
		});

		// Assert

		expect(savedBeforeUnmount).toBe(0);
		expect(updateReadPointMock).toHaveBeenCalledWith({
			readingId: "r1",
			readPoint: { split: 4, block: 2 },
		});
	});

	it("Should not flush anything on unmount when the debounce delay has already elapsed", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		const { unmount } = renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 0 },
			restoredRef,
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.advanceTimersByTime(20 + AUTO_SAVE_DELAY_IN_MILLISECONDS);
		});
		act(() => {
			unmount();
		});

		// Assert

		expect(updateReadPointMock).toHaveBeenCalledTimes(1);
	});

	it("Should persist the read point when an extract is created", () => {
		// Arrange

		const root = makeRoot(5);
		const restoredRef = { current: true };
		const { result } = renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 0 },
			restoredRef,
		});

		// Act

		act(() => {
			result.current.recordExtractReadPoint(4, 3);
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).toHaveBeenCalledWith({
			readingId: "r1",
			readPoint: { split: 4, block: 3 },
		});
	});

	it("Should stop automatic tracking after an extract is created", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		const { result } = renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 0 },
			restoredRef,
		});

		// Act

		act(() => {
			result.current.recordExtractReadPoint(4, 3);
			vi.runAllTimers();
		});
		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).toHaveBeenCalledTimes(1);
		expect(updateReadPointMock).toHaveBeenCalledWith({
			readingId: "r1",
			readPoint: { split: 4, block: 3 },
		});
	});

	it("Should not let an extract relocate a read point that was already set manually", () => {
		// Arrange

		const root = makeRoot(5);
		const restoredRef = { current: true };
		const { result } = renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 0 },
			restoredRef,
		});
		act(() => {
			result.current.trackCursor(4, 3);
			window.dispatchEvent(new Event(READ_POINT_MANUAL_SET_REQUESTED));
		});

		// Act

		act(() => {
			result.current.recordExtractReadPoint(4, 1);
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).toHaveBeenCalledTimes(1);
		expect(updateReadPointMock).toHaveBeenCalledWith({
			readingId: "r1",
			readPoint: { split: 4, block: 3 },
		});
	});

	it("Should let a manual set override a read point that was already set by an extract", () => {
		// Arrange

		const root = makeRoot(5);
		const restoredRef = { current: true };
		const { result } = renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 0 },
			restoredRef,
		});
		act(() => {
			result.current.recordExtractReadPoint(4, 1);
			result.current.trackCursor(4, 3);
			window.dispatchEvent(new Event(READ_POINT_MANUAL_SET_REQUESTED));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).toHaveBeenCalledTimes(1);
		expect(updateReadPointMock).toHaveBeenCalledWith({
			readingId: "r1",
			readPoint: { split: 4, block: 3 },
		});
	});

	it("Should persist the last tracked cursor position when a manual set is requested", () => {
		// Arrange

		const root = makeRoot(5);
		const restoredRef = { current: true };
		const { result } = renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 0 },
			restoredRef,
		});
		act(() => {
			result.current.trackCursor(4, 3);
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event(READ_POINT_MANUAL_SET_REQUESTED));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).toHaveBeenCalledWith({
			readingId: "r1",
			readPoint: { split: 4, block: 3 },
		});
	});

	it("Should fall back to the top visible block when a manual set is requested and no cursor has been tracked yet", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 0 },
			restoredRef,
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event(READ_POINT_MANUAL_SET_REQUESTED));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).toHaveBeenCalledWith({
			readingId: "r1",
			readPoint: { split: 4, block: 2 },
		});
	});

	it("Should stop automatic tracking after a manual set is requested", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		const { result } = renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 0 },
			restoredRef,
		});
		act(() => {
			result.current.trackCursor(4, 3);
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event(READ_POINT_MANUAL_SET_REQUESTED));
			vi.runAllTimers();
		});
		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).toHaveBeenCalledTimes(1);
		expect(updateReadPointMock).toHaveBeenCalledWith({
			readingId: "r1",
			readPoint: { split: 4, block: 3 },
		});
	});

	it("Should clear the read point when a manual clear is requested", () => {
		// Arrange

		const root = makeRoot(5);
		const restoredRef = { current: true };
		renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 3 },
			restoredRef,
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event(READ_POINT_MANUAL_CLEAR_REQUESTED));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).toHaveBeenCalledWith({
			readingId: "r1",
			readPoint: { split: 0, block: 0 },
		});
	});

	it("Should stop automatic tracking after a manual clear is requested", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		renderReadPoint({
			root,
			primarySeq: 4,
			initial: { split: 4, block: 3 },
			restoredRef,
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event(READ_POINT_MANUAL_CLEAR_REQUESTED));
			vi.runAllTimers();
		});
		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadPointMock).toHaveBeenCalledTimes(1);
		expect(updateReadPointMock).toHaveBeenCalledWith({
			readingId: "r1",
			readPoint: { split: 0, block: 0 },
		});
	});
});
