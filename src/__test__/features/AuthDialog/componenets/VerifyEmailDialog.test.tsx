import userEvent from "@testing-library/user-event";
import { getUserInformation } from "../../../../api/backend/api/userApi.ts";
import VerifyEmailDialog from "../../../../features/AuthDialog/components/VerifyEmailDialog.tsx";
import { UserInformationDto } from "../../../../api/backend/dto/userInformationDto.ts";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.tsx";
import {
	resendEmailVerificationCode,
	verifyUserEmail,
} from "../../../../api/backend/api/authApi.ts";
import { screen } from "@testing-library/react";

vi.mock(import("../../../../api/backend/api/authApi.ts"));
vi.mock(import("../../../../api/backend/api/userApi.ts"));
vi.mock(import("../../../../utils/tauriUtils.ts"), () => ({
	isAndroid: vi.fn(() => true),
}));

describe("VerifyEmailDialog", () => {
	test("Should call backend, update user information, and close on successful submit", async () => {
		// Arrange

		vi.mocked(getUserInformation).mockResolvedValue({
			isEmailVerified: true,
		} as UserInformationDto);

		const onCloseMock = vi.fn();

		const { store } = renderWithProviders(
			<VerifyEmailDialog onClose={onCloseMock} />,
		);

		// Act

		await userEvent.keyboard("12345678{Enter}");

		// Assert

		expect(verifyUserEmail).toHaveBeenCalledWith("12345678");
		expect(store.getState().user.userInformation?.isEmailVerified).toBe(
			true,
		);
		expect(onCloseMock).toHaveBeenCalled();
	});

	test("Should resend email verification button code when button is clicked, show success message and hide button", async () => {
		// Arrange

		renderWithProviders(<VerifyEmailDialog onClose={vi.fn()} />);

		// Act

		await userEvent.click(screen.getByText("Resend verification code"));

		// Assert

		expect(vi.mocked(resendEmailVerificationCode)).toHaveBeenCalled();
		expect(
			screen.queryByText(
				"Verification code has been resent to your email!",
			),
		).not.toBeNull();
		expect(screen.queryByText("Resend verification code")).toBeNull();
	});
});
