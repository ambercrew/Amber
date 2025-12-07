import { useRef } from "react";
import useOutsideClick from "../../hooks/useOutsideClick";
import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("useOutsideClick", () => {
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

		await userEvent.click(screen.getByText("First"));

		// Assert

		expect(cb).toHaveBeenCalled();
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

		await userEvent.click(screen.getByText("Second"));

		// Assert

		expect(cb).not.toHaveBeenCalled();
	});
});
