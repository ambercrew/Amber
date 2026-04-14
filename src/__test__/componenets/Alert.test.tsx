import { act, render, screen, waitFor } from "@testing-library/react";
import Alert from "../../components/Alert/Alert";

describe("Alert", () => {
	it("Calls function on close", async () => {
		// Arrange

		const fn = vi.fn();
		render(
			<Alert type="error" onClose={fn}>
				<p>Error</p>
			</Alert>,
		);

		// Act

		act(() => {
			screen.getByRole("button").click();
		});

		// Assert

		await waitFor(() => {
			expect(fn).toHaveBeenCalled();
		});
	});
});
