import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReadingPosition } from "../../../../features/ElementViewer/ReadingView/useReadingPosition";
import { AUTO_SAVE_DELAY_IN_MILLISECONDS } from "../../../../config/constants";

const { updateReadingPositionMock } = vi.hoisted(() => ({
	updateReadingPositionMock: vi.fn(),
}));

vi.mock("../../../../api/elements/api/elementsApi", () => ({
	updateReadingPosition: updateReadingPositionMock,
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

interface ReadingPosition {
	positionSplit: number;
	positionBlock: number;
}

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
// one still visible, so the saved `positionBlock` should be 2.
const BOTTOMS_TOP_VISIBLE_IS_TWO = [10, 10, 100, 100, 100];

function renderPosition(overrides: {
	root: HTMLElement | undefined;
	primarySeq: number;
	initial: ReadingPosition;
	restoredRef: { current: boolean };
	readingId?: string;
}) {
	const {
		root,
		primarySeq,
		initial,
		restoredRef,
		readingId = "r1",
	} = overrides;
	return renderHook(() =>
		useReadingPosition({
			readingId,
			primarySeq,
			initial,
			getContentRoot: () => root,
			restoredRef,
		}),
	);
}

describe("useReadingPosition", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		updateReadingPositionMock.mockResolvedValue(undefined);
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
		const { result } = renderPosition({
			root,
			primarySeq: 2,
			initial: { positionSplit: 2, positionBlock: 0 },
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
		const { result } = renderPosition({
			root,
			primarySeq: 3,
			initial: { positionSplit: 3, positionBlock: 2 },
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
		const { result } = renderPosition({
			root,
			primarySeq: 3,
			initial: { positionSplit: 3, positionBlock: 2 },
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

	it("Should not persist position on scroll before restore has landed", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: false };
		renderPosition({
			root,
			primarySeq: 4,
			initial: { positionSplit: 4, positionBlock: 0 },
			restoredRef,
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadingPositionMock).not.toHaveBeenCalled();
	});

	it("Should persist the top visible block after scrolling once restored", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		renderPosition({
			root,
			primarySeq: 4,
			initial: { positionSplit: 4, positionBlock: 0 },
			restoredRef,
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadingPositionMock).toHaveBeenCalledWith({
			readingId: "r1",
			positionSplit: 4,
			positionBlock: 2,
		});
	});

	it("Should not persist a position identical to the last saved one", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		renderPosition({
			root,
			primarySeq: 4,
			// Last-saved is seeded from `initial`, and the scroll resolves to
			// block 2 as well, so there is nothing new to write.
			initial: { positionSplit: 4, positionBlock: 2 },
			restoredRef,
		});

		// Act

		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.runAllTimers();
		});

		// Assert

		expect(updateReadingPositionMock).not.toHaveBeenCalled();
	});

	it("Should flush the pending position when unmounting before the debounce fires", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		const { unmount } = renderPosition({
			root,
			primarySeq: 4,
			initial: { positionSplit: 4, positionBlock: 0 },
			restoredRef,
		});

		// Act

		// Run the scroll's rAF (records the position) but not the autosave debounce.
		act(() => {
			window.dispatchEvent(new Event("scroll"));
			vi.advanceTimersByTime(20);
		});
		const savedBeforeUnmount = updateReadingPositionMock.mock.calls.length;
		act(() => {
			unmount();
		});

		// Assert

		expect(savedBeforeUnmount).toBe(0);
		expect(updateReadingPositionMock).toHaveBeenCalledWith({
			readingId: "r1",
			positionSplit: 4,
			positionBlock: 2,
		});
	});

	it("Should not flush anything on unmount when the debounce delay has already elapsed", () => {
		// Arrange

		const root = makeRoot(5);
		setBlockBottoms(root, BOTTOMS_TOP_VISIBLE_IS_TWO);
		const restoredRef = { current: true };
		const { unmount } = renderPosition({
			root,
			primarySeq: 4,
			initial: { positionSplit: 4, positionBlock: 0 },
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

		expect(updateReadingPositionMock).toHaveBeenCalledTimes(1);
	});
});
