import userEvent from "@testing-library/user-event";
import SideBar from "../../../../features/SideBar/components/SideBar";
import { UserInformationDto } from "../../../../types/backend/dto/userInformationDto";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { screen } from "@testing-library/react";
import { verifyUserEmail } from "../../../../api/authApi";
import useAppDispatch from "../../../../hooks/useAppDispatch";
import { setUserInformation } from "../../../../stores/user/userReducer";

vi.mock(import("../../../../api/authApi.ts"));

describe("SideBar", () => {
	it("Should be able to verify email", async () => {
		// Arrange

		renderWithProviders(
			<SideBar
				onExpand={vi.fn()}
				onCollapse={vi.fn()}
				isExpanded
				onSettingsClick={vi.fn()}
			/>,
			{
				preloadedState: {
					user: {
						isSignedIn: true,
						userInformation: {
							isEmailVerified: false,
						} as Partial<UserInformationDto> as UserInformationDto,
					},
				},
			},
		);

		// Act

		await userEvent.click(screen.getByText("Verify your email!"));
		await userEvent.keyboard("12345678{Enter}");

		// Assert

		expect(vi.mocked(verifyUserEmail)).toBeCalledWith("12345678");
	});

	it("Should not see verify email button if verified", () => {
		// Act

		renderWithProviders(
			<SideBar
				onExpand={vi.fn()}
				onCollapse={vi.fn()}
				isExpanded
				onSettingsClick={vi.fn()}
			/>,
			{
				preloadedState: {
					user: {
						isSignedIn: true,
						userInformation: {
							isEmailVerified: true,
						} as Partial<UserInformationDto> as UserInformationDto,
					},
				},
			},
		);

		// Assert

		expect(screen.queryByText("Verify your email!")).toBeNull();
	});

	it("Should not see verify email button if not signed-in", () => {
		// Act

		renderWithProviders(
			<SideBar
				onExpand={vi.fn()}
				onCollapse={vi.fn()}
				isExpanded
				onSettingsClick={vi.fn()}
			/>,
			{
				preloadedState: {
					user: {
						isSignedIn: false,
						userInformation: {
							isEmailVerified: false,
						} as Partial<UserInformationDto> as UserInformationDto,
					},
				},
			},
		);

		// Assert

		expect(screen.queryByText("Verify your email!")).toBeNull();
	});

	it("Should automatically open verify email address when email is not verified", async () => {
		// Arrange

		const Component = () => {
			const dispatch = useAppDispatch();

			return (
				<>
					<button
						onClick={() =>
							dispatch(
								setUserInformation({
									isEmailVerified: false,
								} as Partial<UserInformationDto> as UserInformationDto),
							)
						}>
						Sign-in
					</button>
					<SideBar
						onExpand={vi.fn()}
						onCollapse={vi.fn()}
						isExpanded
						onSettingsClick={vi.fn()}
					/>
				</>
			);
		};

		renderWithProviders(<Component />);

		// Act

		await userEvent.click(screen.getByText("Sign-in"));
		await userEvent.keyboard("12345678{Enter}");

		// Assert

		expect(vi.mocked(verifyUserEmail)).toBeCalledWith("12345678");
	});
});
