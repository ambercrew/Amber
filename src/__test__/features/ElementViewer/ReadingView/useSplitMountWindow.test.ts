import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSplitMountWindow } from "../../../../features/ElementViewer/ReadingView/useSplitMountWindow";
import { ReadingSplitMetaDto } from "../../../../types/elements/readingSplitMetaDto";

function makeSplits(count: number): ReadingSplitMetaDto[] {
	return Array.from({ length: count }, (_, index) => ({
		seq: index,
		charCount: 10,
	}));
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
