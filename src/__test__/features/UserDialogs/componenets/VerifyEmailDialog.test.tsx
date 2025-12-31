import userEvent from "@testing-library/user-event";
import { getUserInformation } from "../../../../api/userApi";
import VerifyEmailDialog from "../../../../features/UserDialogs/components/VerifyEmailDialog";
import { UserInformationDto } from "../../../../types/backend/dto/userInformationDto";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import {
	resendEmailVerificationCode,
	verifyUserEmail,
} from "../../../../api/authApi";
import { screen } from "@testing-library/react";

vi.mock(import("../../../../api/authApi.ts"));
vi.mock(import("../../../../api/userApi.ts"));

describe("VerifyEmailDialog", () => {
	test("Should call backend, update user information, and close on successful submit", async () => {
		// Arrange

		vi.mocked(getUserInformation).mockReturnValue(
			Promise.resolve({
				isEmailVerified: true,
			} as UserInformationDto),
		);

		const onCloseMock = vi.fn();

		const { store } = renderWithProviders(
			<VerifyEmailDialog onClose={onCloseMock} />,
		);

		// Act

		await userEvent.keyboard("12345678{Enter}");

		// Assert

		expect(verifyUserEmail).toBeCalledWith("12345678");
		expect(store.getState().user.userInformation?.isEmailVerified).toBe(
			true,
		);
		expect(onCloseMock).toBeCalled();
	});

	test("Should resend email verification button code when button is clicked, show success message and hide button", async () => {
		// Arrange

		renderWithProviders(<VerifyEmailDialog onClose={vi.fn()} />);

		// Act

		await userEvent.click(screen.getByText("Resend verification code"));

		// Assert

		expect(vi.mocked(resendEmailVerificationCode)).toBeCalled();
		expect(
			screen.queryByText(
				"Verification code has been resent to your email!",
			),
		).not.toBeNull();
		expect(screen.queryByText("Resend verification code")).toBeNull();
	});
});
