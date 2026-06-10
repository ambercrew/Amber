import { render, screen, waitFor } from "@testing-library/react";
import Dialog from "../../components/Dialog/Dialog";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { onBackButtonPress } from "@tauri-apps/api/app";
import { PluginListener } from "@tauri-apps/api/core";

vi.mock(import("@tauri-apps/api/app"));

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

	it("Should focus last focused element when dialog is hidden", async () => {
		// Arrange

		function Component() {
			const [showDialog, setShowDialog] = useState(false);

			return (
				<>
					<button onClick={() => setShowDialog(true)}>
						Show dialog
					</button>
					{showDialog && (
						<Dialog
							onHide={() => setShowDialog(false)}
							focusTrap={false}>
							Dialog
						</Dialog>
					)}
				</>
			);
		}

		render(<Component />);

		// Act

		await userEvent.click(screen.getByText("Show dialog"));
		await userEvent.click(screen.getByText("Dialog"));
		await userEvent.keyboard("{Escape}");

		// Assert

		expect(document.activeElement?.tagName.toLowerCase()).toBe("button");
	});

	it("Should focus last focused element when submitting form and dialog is hidden", async () => {
		// Arrange

		function Component() {
			const [showDialog, setShowDialog] = useState(false);

			return (
				<>
					<button onClick={() => setShowDialog(true)}>
						Show dialog
					</button>
					{showDialog && (
						<Dialog
							onHide={() => setShowDialog(false)}
							focusTrap={false}>
							<form>
								<button onClick={() => setShowDialog(false)}>
									Submit
								</button>
							</form>
						</Dialog>
					)}
				</>
			);
		}

		render(<Component />);

		// Act

		await userEvent.click(screen.getByText("Show dialog"));
		await userEvent.click(screen.getByText("Submit"));

		// Assert

		expect(document.activeElement?.tagName.toLowerCase()).toBe("button");
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
