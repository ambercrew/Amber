import userEvent from "@testing-library/user-event";
import DeleteUserDialog from "../../../../features/AuthDialog/components/DeleteUserDialog.tsx";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.tsx";
import { screen } from "@testing-library/react";
import { deleteUser } from "../../../../api/userApi.ts";

vi.mock(import("../../../../api/userApi.ts"));

describe("DeleteUserDialog", () => {
	it("Show show an error if the input field is not filled correctly", async () => {
		// Arrange

		renderWithProviders(<DeleteUserDialog onHide={vi.fn()} />);

		// Act

		await userEvent.click(screen.getByRole("textbox"));
		await userEvent.keyboard("test");
		await userEvent.click(screen.getByRole("checkbox"));
		await userEvent.click(screen.getByText("Delete"));

		// Assert

		expect(
			screen.queryByText(
				"You need to write 'DELETE MY ACCOUNT' in the input to verify the deletion.",
			),
		).not.toBeNull();

		expect(deleteUser).not.toHaveBeenCalled();
	});

	it("Should have the checkbox as required", () => {
		// Act

		renderWithProviders(<DeleteUserDialog onHide={vi.fn()} />);

		// Assert

		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).toBeRequired();
	});

	it("Show call the backend and update global state when input is filled correctly", async () => {
		// Arrange

		const onHideMock = vi.fn();
		const { store } = renderWithProviders(
			<DeleteUserDialog onHide={onHideMock} />,
			{
				preloadedState: {
					user: {
						isSignedIn: true,
						userInformation: null,
					},
				},
			},
		);

		// Act

		await userEvent.click(screen.getByRole("textbox"));
		await userEvent.keyboard("DELETE MY ACCOUNT");
		await userEvent.click(screen.getByRole("checkbox"));
		await userEvent.click(screen.getByText("Delete"));

		// Assert

		expect(onHideMock).toHaveBeenCalled();
		expect(deleteUser).toHaveBeenCalled();
		expect(store.getState().user.isSignedIn).toBe(false);
	});
});
