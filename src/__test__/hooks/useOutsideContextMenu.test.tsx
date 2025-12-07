import { renderHook, render, screen } from "@testing-library/react";
import { useRef } from "react";
import useOutsideContextMenu from "../../hooks/useOutsideContextMenu";
import userEvent from "@testing-library/user-event";

describe("useOutsideContextMenu", () => {
	it("Calls callback on outside context menu", async () => {
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
			useOutsideContextMenu(ref as React.RefObject<HTMLElement>, cb),
		);

		// Act

		await userEvent.pointer({
			target: screen.getByText("First"),
			keys: "[MouseRight>]",
		});

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
			useOutsideContextMenu(ref as React.RefObject<HTMLElement>, cb),
		);

		// Act

		await userEvent.pointer({
			target: screen.getByText("Second"),
			keys: "[MouseRight>]",
		});

		// Assert

		expect(cb).not.toHaveBeenCalled();
	});
});
