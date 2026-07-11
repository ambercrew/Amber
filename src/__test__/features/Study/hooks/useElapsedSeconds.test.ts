import { act, renderHook } from "@testing-library/react";
import { useElapsedSeconds } from "../../../../features/Study/hooks/useElapsedSeconds";

describe("useElapsedSeconds", () => {
	it("Should return 0 when startedAt is null", () => {
		// Act

		const { result } = renderHook(() => useElapsedSeconds(null));

		// Assert

		expect(result.current).toBe(0);
	});

	it("Should increment once per second when startedAt is set", () => {
		// Arrange

		vi.useFakeTimers();
		const startedAt = Date.now();

		// Act

		const { result } = renderHook(() => useElapsedSeconds(startedAt));
		void act(() => vi.advanceTimersByTime(1000));

		// Assert

		expect(result.current).toBe(1);

		vi.useRealTimers();
	});

	it("Should reset elapsed time when startedAt changes", () => {
		// Arrange

		vi.useFakeTimers();
		const firstStart = Date.now();

		// Act

		const { result, rerender } = renderHook(
			({ startedAt }) => useElapsedSeconds(startedAt),
			{ initialProps: { startedAt: firstStart as number | null } },
		);
		void act(() => vi.advanceTimersByTime(3000));
		expect(result.current).toBe(3);

		const secondStart = firstStart + 60_000;
		rerender({ startedAt: secondStart });

		// Assert

		expect(result.current).toBe(0);

		vi.useRealTimers();
	});

	it("Should stop incrementing after startedAt becomes null", () => {
		// Arrange

		vi.useFakeTimers();
		const startedAt = Date.now();

		// Act

		const { result, rerender } = renderHook(
			({ startedAt }) => useElapsedSeconds(startedAt),
			{ initialProps: { startedAt: startedAt as number | null } },
		);
		void act(() => vi.advanceTimersByTime(2000));
		rerender({ startedAt: null });

		// Assert

		expect(result.current).toBe(0);

		vi.useRealTimers();
	});
});
