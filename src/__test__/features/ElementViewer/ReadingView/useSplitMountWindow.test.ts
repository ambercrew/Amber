/* eslint-disable @typescript-eslint/no-empty-function */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSplitMountWindow } from "../../../../features/ElementViewer/ReadingView/useSplitMountWindow";
import { ReadingSplitMetaDto } from "../../../../types/elements/readingSplitMetaDto";

function makeSplits(count: number): ReadingSplitMetaDto[] {
	return Array.from({ length: count }, (_, index) => ({
		seq: index,
		charCount: 10,
	}));
}

function sorted(seqs: Set<number>): number[] {
	return [...seqs].sort((a, b) => a - b);
}

describe("useSplitMountWindow", () => {
	it("Should mount only the window around the initial split", () => {
		// Arrange

		const splits = makeSplits(10);

		// Act

		const { result } = renderHook(() =>
			useSplitMountWindow({
				splits,
				initialSeq: 0,
			}),
		);

		// Assert

		// NEIGHBORS is 1, so the primary split (0) plus one below it.
		expect([...result.current.mountedSeqs].sort((a, b) => a - b)).toEqual([
			0, 1,
		]);
	});

	it("Should mount the window centered on a middle initial split", () => {
		// Arrange

		const splits = makeSplits(10);

		// Act

		const { result } = renderHook(() =>
			useSplitMountWindow({
				splits,
				initialSeq: 5,
			}),
		);

		// Assert

		expect([...result.current.mountedSeqs].sort((a, b) => a - b)).toEqual([
			4, 5, 6,
		]);
	});
});

describe("useSplitMountWindow restore gating", () => {
	const originalObserver = window.IntersectionObserver;
	let observerCallback: IntersectionObserverCallback | null = null;

	class ControllableIntersectionObserver {
		constructor(callback: IntersectionObserverCallback) {
			observerCallback = callback;
		}
		observe() {}
		unobserve() {}
		disconnect() {}
		takeRecords() {
			return [];
		}
	}

	beforeEach(() => {
		observerCallback = null;
		window.IntersectionObserver =
			ControllableIntersectionObserver as unknown as typeof IntersectionObserver;
	});

	afterEach(() => {
		window.IntersectionObserver = originalObserver;
	});

	function intersect(target: Element, isIntersecting: boolean) {
		act(() => {
			observerCallback?.(
				[{ target, isIntersecting } as IntersectionObserverEntry],
				{} as IntersectionObserver,
			);
		});
	}

	it("Should keep the window pinned to the initial split while restore is pending", () => {
		// Arrange

		const splits = makeSplits(10);
		const restoredRef = { current: false };
		const { result } = renderHook(() =>
			useSplitMountWindow({ splits, initialSeq: 5, restoredRef }),
		);
		const topSlot = document.createElement("div");
		act(() => {
			result.current.registerSlot(0)(topSlot);
		});

		// Act

		// The document opens at the top, so the top split reports as intersecting.
		intersect(topSlot, true);

		// Assert

		expect(result.current.primarySeq).toBe(5);
		expect(sorted(result.current.mountedSeqs)).toEqual([4, 5, 6]);
	});

	it("Should follow the viewport once restore has landed", () => {
		// Arrange

		const splits = makeSplits(10);
		const restoredRef = { current: false };
		const { result } = renderHook(() =>
			useSplitMountWindow({ splits, initialSeq: 5, restoredRef }),
		);
		const topSlot = document.createElement("div");
		act(() => {
			result.current.registerSlot(0)(topSlot);
		});

		// Act

		restoredRef.current = true;
		intersect(topSlot, true);

		// Assert

		expect(result.current.primarySeq).toBe(0);
		expect(sorted(result.current.mountedSeqs)).toEqual([0, 1]);
	});
});
