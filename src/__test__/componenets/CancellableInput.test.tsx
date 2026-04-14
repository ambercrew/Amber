import { render, screen } from "@testing-library/react";
import CancellableInput from "../../components/CancellableInput/CancellableInput";
import userEvent from "@testing-library/user-event";

describe("CancellableInput", () => {
	it("Should calls onCancel when pressing Escape", async () => {
		// Arrange

		const fn = vi.fn();
		render(
			<CancellableInput onCancel={fn} placeholder={"CancellableInput"} />,
		);

		// Act

		// Focusing on the input.
		await userEvent.click(screen.getByPlaceholderText("CancellableInput"));
		await userEvent.keyboard("{Escape}");

		// Assert

		expect(fn).toHaveBeenCalled();
	});
});
