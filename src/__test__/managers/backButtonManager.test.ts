import { onBackButtonPress } from "@tauri-apps/api/app";
import { PluginListener } from "@tauri-apps/api/core";
import {
	BackButtonManager,
	BackButtonPriority,
} from "../../managers/backButtonManager";
import { isAndroid } from "../../utils/tauriUtils";

vi.mock(import("../../utils/tauriUtils"));

function makeListener(unregister = vi.fn()): PluginListener {
	return { unregister } as unknown as PluginListener;
}

/** Fires the back press the manager registered with Tauri. */
function pressBack() {
	const handler = vi.mocked(onBackButtonPress).mock.calls[0][0];
	handler({ canGoBack: false });
}

describe("BackButtonManager", () => {
	let subject: BackButtonManager;

	beforeEach(() => {
		vi.mocked(isAndroid).mockReturnValue(true);
		vi.mocked(onBackButtonPress).mockResolvedValue(makeListener());
		subject = new BackButtonManager();
	});

	it("Should run the only handler when the back button is pressed", () => {
		// Arrange

		const cb = vi.fn();
		subject.addHandler(cb, BackButtonPriority.Medium);

		// Act

		pressBack();

		// Assert

		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("Should run only the highest priority handler when several are registered", () => {
		// Arrange

		const low = vi.fn();
		const medium = vi.fn();
		const high = vi.fn();
		subject.addHandler(high, BackButtonPriority.High);
		subject.addHandler(low, BackButtonPriority.Low);
		subject.addHandler(medium, BackButtonPriority.Medium);

		// Act

		pressBack();

		// Assert

		expect(high).toHaveBeenCalledTimes(1);
		expect(medium).not.toHaveBeenCalled();
		expect(low).not.toHaveBeenCalled();
	});

	it("Should run the newest handler when priorities are equal", () => {
		// Arrange

		const first = vi.fn();
		const second = vi.fn();
		subject.addHandler(first, BackButtonPriority.Medium);
		subject.addHandler(second, BackButtonPriority.Medium);

		// Act

		pressBack();

		// Assert

		expect(second).toHaveBeenCalledTimes(1);
		expect(first).not.toHaveBeenCalled();
	});

	it("Should fall back to the lower priority handler when the higher one is removed", () => {
		// Arrange

		const low = vi.fn();
		const high = vi.fn();
		subject.addHandler(low, BackButtonPriority.Low);
		const removeHigh = subject.addHandler(high, BackButtonPriority.High);

		// Act

		removeHigh();
		pressBack();

		// Assert

		expect(low).toHaveBeenCalledTimes(1);
		expect(high).not.toHaveBeenCalled();
	});

	it("Should register the Tauri listener only once for several handlers", async () => {
		// Arrange, Act

		subject.addHandler(vi.fn(), BackButtonPriority.Low);
		subject.addHandler(vi.fn(), BackButtonPriority.Medium);
		await vi.waitFor(() => expect(onBackButtonPress).toHaveBeenCalled());

		// Assert

		expect(onBackButtonPress).toHaveBeenCalledTimes(1);
	});

	it("Should leave the back button alone when the last handler is removed", async () => {
		// Arrange

		const unregister = vi.fn();
		vi.mocked(onBackButtonPress).mockResolvedValue(
			makeListener(unregister),
		);
		const remove = subject.addHandler(vi.fn(), BackButtonPriority.Medium);
		await vi.waitFor(() => expect(onBackButtonPress).toHaveBeenCalled());

		// Act

		remove();

		// Assert

		await vi.waitFor(() => expect(unregister).toHaveBeenCalled());
		expect(subject.activeHandler).toBeNull();
	});

	it("Should unregister the listener when handlers are gone before it resolves", async () => {
		// Arrange

		const unregister = vi.fn();
		let resolveListener!: (listener: PluginListener) => void;
		vi.mocked(onBackButtonPress).mockReturnValue(
			new Promise(resolve => {
				resolveListener = resolve;
			}),
		);
		const remove = subject.addHandler(vi.fn(), BackButtonPriority.Medium);

		// Act

		remove();
		resolveListener(makeListener(unregister));

		// Assert

		await vi.waitFor(() => expect(unregister).toHaveBeenCalled());
	});

	it("Should not listen for the back button when not on Android", () => {
		// Arrange

		vi.mocked(isAndroid).mockReturnValue(false);

		// Act

		subject.addHandler(vi.fn(), BackButtonPriority.Medium);

		// Assert

		expect(onBackButtonPress).not.toHaveBeenCalled();
	});
});
