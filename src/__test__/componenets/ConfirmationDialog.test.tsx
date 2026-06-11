import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmationDialog from "../../components/ConfirmationDialog/ConfirmationDialog";

vi.mock(import("../../utils/tauriUtils.ts"), () => ({
	isAndroid: vi.fn(() => true),
}));

describe("ConfirmationDialog", () => {
	it("Should calls onCancel when clicking on No", async () => {
		// Arrange

		const onCancel = vi.fn();
		render(
			<ConfirmationDialog
				onCancel={onCancel}
				onConfirm={vi.fn()}
				title=""
				text=""
			/>,
		);

		// Act

		// Focusing on the input.
		await userEvent.click(screen.getByText("No"));

		// Assert

		expect(onCancel).toHaveBeenCalled();
	});

	it("Should calls onConfirm when clicking on Yes", async () => {
		// Arrange

		const onConfirm = vi.fn();
		render(
			<ConfirmationDialog
				onCancel={vi.fn()}
				onConfirm={onConfirm}
				title=""
				text=""
			/>,
		);

		// Act

		// Focusing on the input.
		await userEvent.click(screen.getByText("Yes"));

		// Assert

		expect(onConfirm).toHaveBeenCalled();
	});
});
