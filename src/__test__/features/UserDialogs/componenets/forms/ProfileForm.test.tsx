import userEvent from "@testing-library/user-event";
import ProfileForm from "../../../../../features/UserDialogs/components/forms/ProfileForm.tsx";
import { renderWithProviders } from "../../../../test-utils/renderWithProviders.tsx";
import { screen } from "@testing-library/react";
import {
	getUserInformation,
	updateUserInformation,
} from "../../../../../api/userApi.ts";
import { UserInformationDto } from "../../../../../types/backend/dto/userInformationDto.ts";
import { signOut, updatePassword } from "../../../../../api/authApi.ts";
import { UserState } from "../../../../../stores/user/userReducer.ts";
import useAppSelector from "../../../../../hooks/useAppSelector.ts";
import { selectIsSignedIn } from "../../../../../stores/user/userSelectors.ts";

vi.mock(import("../../../../../api/authApi.ts"));
vi.mock(import("../../../../../api/userApi.ts"));

const createInitialUserState = ({
	isSignedIn,
	userInformation,
}: {
	isSignedIn: boolean;
	userInformation?: Partial<UserInformationDto>;
}) => {
	return {
		isSignedIn,
		userInformation: userInformation ?? {
			firstName: "first name",
			lastName: "last name",
		},
	} as UserState;
};

describe("ProfileForm", () => {
	it("Should update user information when submitting", async () => {
		// Arrange

		vi.mocked(getUserInformation).mockReturnValue(
			Promise.resolve({
				firstName: "New first name",
				lastName: "New last name",
			} as Partial<UserInformationDto> as UserInformationDto),
		);

		const onCloseMock = vi.fn();
		const onRequestStartMock = vi.fn();
		const onRequestEndMock = vi.fn();

		const { store } = renderWithProviders(
			<ProfileForm
				isSendingRequest={false}
				onClose={onCloseMock}
				onRequestStart={onRequestStartMock}
				onRequestEnd={onRequestEndMock}
			/>,
			{
				preloadedState: {
					user: createInitialUserState({ isSignedIn: true }),
				},
			},
		);

		// Act

		await userEvent.click(screen.getByText("Firstname"));
		await userEvent.keyboard("{backspace>100}New first name");
		await userEvent.click(screen.getByText("Lastname"));
		await userEvent.keyboard("{backspace>100}New last name{Enter}");

		// Assert

		expect(vi.mocked(updateUserInformation)).toBeCalledWith(
			"New first name",
			"New last name",
		);
		expect(vi.mocked(updatePassword)).not.toBeCalled();

		expect(onRequestStartMock).toHaveBeenCalledBefore(onRequestEndMock);
		expect(onRequestEndMock).toBeCalled();
		expect(onCloseMock).toBeCalled();

		expect(store.getState().user.userInformation?.firstName).toBe(
			"New first name",
		);
		expect(store.getState().user.userInformation?.lastName).toBe(
			"New last name",
		);
	});

	it("Should not call backend when nothing changed", async () => {
		// Arrange

		const onCloseMock = vi.fn();
		const onRequestStartMock = vi.fn();
		const onRequestEndMock = vi.fn();

		renderWithProviders(
			<ProfileForm
				isSendingRequest={false}
				onClose={onCloseMock}
				onRequestStart={onRequestStartMock}
				onRequestEnd={onRequestEndMock}
			/>,
			{
				preloadedState: {
					user: createInitialUserState({ isSignedIn: true }),
				},
			},
		);

		// Act

		await userEvent.click(screen.getByText("Update"));

		// Assert

		expect(vi.mocked(updateUserInformation)).not.toBeCalled();
		expect(vi.mocked(updatePassword)).not.toBeCalled();

		expect(onRequestStartMock).not.toBeCalled();
		expect(onRequestEndMock).not.toBeCalled();
		expect(onCloseMock).toBeCalled();
	});

	it("Should sign-out when pressing the button", async () => {
		// Arrange

		const onRequestStartMock = vi.fn();
		const onRequestEndMock = vi.fn();

		const Component = () => {
			const isSignedIn = useAppSelector(selectIsSignedIn);

			return (
				isSignedIn && (
					<ProfileForm
						isSendingRequest={false}
						onClose={vi.fn()}
						onRequestStart={onRequestStartMock}
						onRequestEnd={onRequestEndMock}
					/>
				)
			);
		};

		const { store } = renderWithProviders(<Component />, {
			preloadedState: {
				user: createInitialUserState({ isSignedIn: true }),
			},
		});

		// Act

		await userEvent.click(screen.getByText("Sign-out"));

		// Assert

		expect(vi.mocked(signOut)).toBeCalled();

		expect(onRequestStartMock).toHaveBeenCalledBefore(onRequestEndMock);
		expect(onRequestEndMock).toBeCalled();

		expect(store.getState().user.isSignedIn).toBe(false);
	});

	it("Should show delete user dialog when button is pressed", async () => {
		// Arrange

		renderWithProviders(
			<ProfileForm
				isSendingRequest={false}
				onClose={vi.fn()}
				onRequestStart={vi.fn()}
				onRequestEnd={vi.fn()}
			/>,
			{
				preloadedState: {
					user: createInitialUserState({ isSignedIn: true }),
				},
			},
		);

		// Act

		await userEvent.click(screen.getByText("Delete my account"));

		// Assert

		expect(screen.queryByText("Delete your account")).not.toBeNull();
	});

	it("Should show error message when passwords do not match", async () => {
		// Arrange

		renderWithProviders(
			<ProfileForm
				isSendingRequest={false}
				onClose={vi.fn()}
				onRequestStart={vi.fn()}
				onRequestEnd={vi.fn()}
			/>,
			{
				preloadedState: {
					user: createInitialUserState({ isSignedIn: true }),
				},
			},
		);

		// Act

		await userEvent.click(screen.getByText("Current password"));
		await userEvent.keyboard("testPassword123");

		await userEvent.click(screen.getByText("New password"));
		await userEvent.keyboard("newPassword");

		await userEvent.click(screen.getByText("Confirm new password"));
		await userEvent.keyboard("newPassword123");

		await userEvent.click(screen.getByText("Update"));

		// Assert

		expect(screen.queryByText("Passwords do not match!")).not.toBeNull();
		expect(vi.mocked(updatePassword)).not.toBeCalled();
	});

	it("Should update user passwords when input is given correctly", async () => {
		// Arrange

		renderWithProviders(
			<ProfileForm
				isSendingRequest={false}
				onClose={vi.fn()}
				onRequestStart={vi.fn()}
				onRequestEnd={vi.fn()}
			/>,
			{
				preloadedState: {
					user: createInitialUserState({ isSignedIn: true }),
				},
			},
		);

		// Act

		await userEvent.click(screen.getByText("Current password"));
		await userEvent.keyboard("testPassword123");

		await userEvent.click(screen.getByText("New password"));
		await userEvent.keyboard("newPassword123");

		await userEvent.click(screen.getByText("Confirm new password"));
		await userEvent.keyboard("newPassword123");

		await userEvent.click(screen.getByText("Update"));

		// Assert

		expect(vi.mocked(updatePassword)).toBeCalledWith(
			"testPassword123",
			"newPassword123",
		);
		expect(vi.mocked(updateUserInformation)).not.toBeCalled();
	});
});
