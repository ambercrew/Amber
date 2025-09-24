import { act, render, screen, waitFor } from "@testing-library/react";
import Alert from "../../components/Alert/Alert";

describe(Alert, () => {
	it("Calls function on close", async () => {
		// Arrange

		const fn = vi.fn();
		render(<Alert message="Error" type="error" onClose={fn} />);

		// Act

		act(() => {
			screen.getByRole("button").click();
		});

		// Assert

		await waitFor(() => {
			expect(fn).toBeCalled();
		});
	});
});
