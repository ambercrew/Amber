import { render, screen, waitFor } from "@testing-library/react";
import Dialog from "../../components/Dialog/Dialog";
import userEvent from "@testing-library/user-event";
import { onBackButtonPress } from "@tauri-apps/api/app";
import { PluginListener } from "@tauri-apps/api/core";

vi.mock(import("@tauri-apps/api/app"));
vi.mock(import("../../utils/tauriUtils.ts"), () => ({
	isAndroid: vi.fn(() => true),
}));

describe("Dialog", () => {
	beforeEach(() => {
		vi.mocked(onBackButtonPress).mockResolvedValue({
			unregister: vi.fn(),
		} as unknown as PluginListener);
	});
	it("Should call onHide when pressing Escape", async () => {
		// Arrange

		const onHide = vi.fn();
		render(
			<Dialog onHide={onHide} focusTrap={false}>
				Dialog
			</Dialog>,
		);

		// Act

		await userEvent.click(screen.getByText("Dialog"));
		await userEvent.keyboard("{Escape}");

		// Assert

		expect(onHide).toHaveBeenCalled();
	});

	it("Should call onHide when Android back button is pressed", async () => {
		// Arrange

		const onHide = vi.fn();
		render(
			<Dialog onHide={onHide} focusTrap={false}>
				Dialog
			</Dialog>,
		);
		await waitFor(() => expect(onBackButtonPress).toHaveBeenCalled());

		// Act

		const registeredCb = vi.mocked(onBackButtonPress).mock
			.calls[0][0] as () => void;
		registeredCb();

		// Assert

		expect(onHide).toHaveBeenCalled();
	});
});
