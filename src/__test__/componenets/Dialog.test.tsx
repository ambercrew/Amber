import { render, screen } from "@testing-library/react";
import Dialog from "../../components/Dialog/Dialog";
import dialogStyles from "../../components/Dialog/styles.module.css";
import userEvent from "@testing-library/user-event";

describe("Dialog", () => {
	it("Should call onHide when clicking on overlay", async () => {
		// Arrange

		const onHide = vi.fn();
		const { container } = render(<Dialog onHide={onHide}>test</Dialog>);
		const overlay = container.getElementsByClassName(
			dialogStyles.overlay,
		)[0];

		// Act

		await userEvent.click(overlay);

		// Assert

		expect(onHide).toBeCalled();
	});

	it("Should call onHide when pressing Escape", async () => {
		// Arrange

		const onHide = vi.fn();
		render(<Dialog onHide={onHide}>test</Dialog>);

		// Act

		await userEvent.click(screen.getByText("test"));
		await userEvent.keyboard("{Escape}");

		// Assert

		expect(onHide).toBeCalled();
	});
});
