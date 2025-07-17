import { act, useRef } from "react";
import useOutsideClick from "../../hooks/useOutsideClick";
import {
	fireEvent,
	render,
	renderHook,
	screen,
	waitFor,
} from "@testing-library/react";

describe(useOutsideClick, () => {
	it("Calls callback on outside click", async () => {
		// Arrange

		const ref = renderHook(() => useRef<HTMLButtonElement>(null)).result
			.current;

		render(
			<div>
				<button>First</button>
				<button ref={ref}>Second</button>
			</div>,
		);

		const cb = vi.fn();
		renderHook(() =>
			useOutsideClick(ref as React.RefObject<HTMLElement>, cb),
		);

		// Act

		act(() => {
			fireEvent.click(screen.getByText("First"));
		});

		// Assert

		await waitFor(() => {
			expect(cb).toHaveBeenCalled();
		});
	});

	it("Does not call the callback on the element click", async () => {
		// Arrange

		const ref = renderHook(() => useRef<HTMLButtonElement>(null)).result
			.current;

		render(
			<div>
				<button>First</button>
				<button ref={ref}>Second</button>
			</div>,
		);

		const cb = vi.fn();
		renderHook(() =>
			useOutsideClick(ref as React.RefObject<HTMLElement>, cb),
		);

		// Act

		act(() => {
			fireEvent.mouseDown(screen.getByText("Second"));
		});

		// Assert

		await waitFor(() => {
			expect(cb).not.toHaveBeenCalled();
		});
	});
});
