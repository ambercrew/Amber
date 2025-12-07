import { render, screen } from "@testing-library/react";
import Dialog from "../../components/Dialog/Dialog";
import dialogStyles from "../../components/Dialog/styles.module.css";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

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
		render(<Dialog onHide={onHide}>Dialog</Dialog>);

		// Act

		await userEvent.click(screen.getByText("Dialog"));
		await userEvent.keyboard("{Escape}");

		// Assert

		expect(onHide).toBeCalled();
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
						<Dialog onHide={() => setShowDialog(false)}>
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
						<Dialog onHide={() => setShowDialog(false)}>
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
});
