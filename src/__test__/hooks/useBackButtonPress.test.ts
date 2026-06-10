import { renderHook, waitFor } from "@testing-library/react";
import { onBackButtonPress } from "@tauri-apps/api/app";
import { PluginListener } from "@tauri-apps/api/core";
import useBackButtonPress from "../../hooks/useBackButtonPress";

vi.mock(import("@tauri-apps/api/app"));

function makeListener(unregister = vi.fn()): PluginListener {
	return { unregister } as unknown as PluginListener;
}

describe("useBackButtonPress", () => {
	beforeEach(() => {
		vi.mocked(onBackButtonPress).mockResolvedValue(makeListener());
	});

	it("Should register the callback with onBackButtonPress when mounted", async () => {
		// Arrange

		const cb = vi.fn();

		// Act

		renderHook(() => useBackButtonPress(cb));

		// Assert

		await waitFor(() => expect(onBackButtonPress).toHaveBeenCalledWith(cb));
	});

	it("Should unregister the listener on unmount", async () => {
		// Arrange

		const unregister = vi.fn();
		vi.mocked(onBackButtonPress).mockResolvedValue(
			makeListener(unregister),
		);
		const { unmount } = renderHook(() => useBackButtonPress(vi.fn()));
		await waitFor(() => expect(onBackButtonPress).toHaveBeenCalled());

		// Act

		unmount();

		// Assert

		expect(unregister).toHaveBeenCalled();
	});

	it("Should unregister the listener when unmounted before registration resolves", async () => {
		// Arrange

		const unregister = vi.fn();
		let resolveListener!: (l: PluginListener) => void;
		vi.mocked(onBackButtonPress).mockReturnValue(
			new Promise(resolve => {
				resolveListener = resolve;
			}),
		);
		const { unmount } = renderHook(() => useBackButtonPress(vi.fn()));

		// Act

		unmount();
		resolveListener(makeListener(unregister));

		// Assert

		await waitFor(() => expect(unregister).toHaveBeenCalled());
	});

	it("Should re-register when the callback reference changes", async () => {
		// Arrange

		const cb1 = vi.fn();
		const cb2 = vi.fn();
		const { rerender } = renderHook(({ cb }) => useBackButtonPress(cb), {
			initialProps: { cb: cb1 },
		});
		await waitFor(() => expect(onBackButtonPress).toHaveBeenCalledTimes(1));

		// Act

		rerender({ cb: cb2 });

		// Assert

		await waitFor(() => expect(onBackButtonPress).toHaveBeenCalledTimes(2));
		expect(vi.mocked(onBackButtonPress).mock.calls[1][0]).toBe(cb2);
	});
});
