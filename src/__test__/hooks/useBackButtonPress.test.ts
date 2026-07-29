import { renderHook } from "@testing-library/react";
import { Mock, MockInstance } from "vitest";
import useBackButtonPress from "../../hooks/useBackButtonPress";
import {
	BackButtonManager,
	BackButtonPriority,
	defaultBackButtonManager,
} from "../../managers/backButtonManager";

describe("useBackButtonPress", () => {
	let addHandler: MockInstance<BackButtonManager["addHandler"]>;
	let removeHandler: Mock<() => void>;

	beforeEach(() => {
		removeHandler = vi.fn();
		addHandler = vi
			.spyOn(defaultBackButtonManager, "addHandler")
			.mockReturnValue(removeHandler);
	});

	/** The handler the hook registered, as the manager received it. */
	function registeredHandler(): () => void {
		return addHandler.mock.calls[0][0];
	}

	it("Should register the handler when mounted", () => {
		// Arrange, Act

		renderHook(() => useBackButtonPress(vi.fn()));

		// Assert

		expect(addHandler).toHaveBeenCalledTimes(1);
	});

	it("Should register with the given priority when one is passed", () => {
		// Arrange, Act

		renderHook(() =>
			useBackButtonPress(vi.fn(), true, BackButtonPriority.High),
		);

		// Assert

		expect(addHandler.mock.calls[0][1]).toBe(BackButtonPriority.High);
	});

	it("Should register with medium priority when none is passed", () => {
		// Arrange, Act

		renderHook(() => useBackButtonPress(vi.fn()));

		// Assert

		expect(addHandler.mock.calls[0][1]).toBe(BackButtonPriority.Medium);
	});

	it("Should call the callback when the registered handler runs", () => {
		// Arrange

		const cb = vi.fn();
		renderHook(() => useBackButtonPress(cb));

		// Act

		registeredHandler()();

		// Assert

		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("Should call the latest callback when it changed since registering", () => {
		// Arrange

		const first = vi.fn();
		const second = vi.fn();
		const { rerender } = renderHook(({ cb }) => useBackButtonPress(cb), {
			initialProps: { cb: first },
		});

		// Act

		rerender({ cb: second });
		registeredHandler()();

		// Assert

		expect(second).toHaveBeenCalledTimes(1);
		expect(first).not.toHaveBeenCalled();
	});

	it("Should not re-register when only the callback reference changes", () => {
		// Arrange

		const { rerender } = renderHook(({ cb }) => useBackButtonPress(cb), {
			initialProps: { cb: vi.fn() },
		});

		// Act

		rerender({ cb: vi.fn() });

		// Assert

		expect(addHandler).toHaveBeenCalledTimes(1);
		expect(removeHandler).not.toHaveBeenCalled();
	});

	it("Should not register the handler when disabled", () => {
		// Arrange, Act

		renderHook(() => useBackButtonPress(vi.fn(), false));

		// Assert

		expect(addHandler).not.toHaveBeenCalled();
	});

	it("Should remove the handler when unmounted", () => {
		// Arrange

		const { unmount } = renderHook(() => useBackButtonPress(vi.fn()));

		// Act

		unmount();

		// Assert

		expect(removeHandler).toHaveBeenCalledTimes(1);
	});

	it("Should remove the handler when it becomes disabled", () => {
		// Arrange

		const { rerender } = renderHook(
			({ enabled }) => useBackButtonPress(vi.fn(), enabled),
			{ initialProps: { enabled: true } },
		);

		// Act

		rerender({ enabled: false });

		// Assert

		expect(removeHandler).toHaveBeenCalledTimes(1);
	});
});
