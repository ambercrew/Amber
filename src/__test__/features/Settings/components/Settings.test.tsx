import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.tsx";
import { screen } from "@testing-library/react";
import {
	getUserInformation,
	updateUserInformation,
} from "../../../../api/userApi.ts";
import { UserInformationDto } from "../../../../types/backend/dto/userInformationDto.ts";
import { signOut, updatePassword } from "../../../../api/authApi.ts";
import { UserState } from "../../../../stores/user/userReducer.ts";
import useAppSelector from "../../../../hooks/useAppSelector.ts";
import { selectIsSignedIn } from "../../../../stores/user/userSelectors.ts";
import Settings from "../../../../features/Settings/components/Settings.tsx";
import { updateSettings } from "../../../../api/settingsApi.ts";
import { SettingsState } from "../../../../stores/settings/settingsReducer.ts";
import SettingsType from "../../../../types/backend/model/settings.ts";
import { Window } from "@tauri-apps/api/window";
import { Webview } from "@tauri-apps/api/webview";

vi.mock(import("../../../../api/authApi.ts"));
vi.mock(import("../../../../api/userApi.ts"));
vi.mock(import("../../../../api/settingsApi.ts"));
vi.mock(import("../../../../managers/closeRequestedEventManager.ts"));
vi.mock(import("@tauri-apps/api/webview"), () => ({
	getCurrentWebview: () =>
		({
			setZoom: vi.fn(),
			window: {
				setTheme: vi.fn(),
			} as Partial<Window>,
		}) as Partial<Webview> as Webview,
}));

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

const createInitialSettingsState = () => {
	return {
		settings: {} as SettingsType,
	} as SettingsState;
};

describe("Profile & Security tab", () => {
	it("Should update user information when submitting", async () => {
		// Arrange

		vi.mocked(getUserInformation).mockReturnValue(
			Promise.resolve({
				firstName: "New first name",
				lastName: "New last name",
			} as Partial<UserInformationDto> as UserInformationDto),
		);

		const onCloseMock = vi.fn();

		const { store } = renderWithProviders(
			<Settings onClose={onCloseMock} />,
			{
				preloadedState: {
					user: createInitialUserState({ isSignedIn: true }),
				},
			},
		);

		// Act

		await userEvent.click(screen.getByText("Profile"));
		await userEvent.click(screen.getByText("First name"));
		await userEvent.keyboard("{backspace>100}New first name");
		await userEvent.click(screen.getByText("Last name"));
		await userEvent.keyboard("{backspace>100}New last name{Enter}");

		// Assert

		expect(vi.mocked(updateUserInformation)).toBeCalledWith(
			"New first name",
			"New last name",
		);
		expect(vi.mocked(updatePassword)).not.toBeCalled();

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

		renderWithProviders(<Settings onClose={onCloseMock} />, {
			preloadedState: {
				user: createInitialUserState({ isSignedIn: true }),
			},
		});

		// Act

		await userEvent.click(screen.getByText("Apply"));

		// Assert

		expect(vi.mocked(updateUserInformation)).not.toBeCalled();
		expect(vi.mocked(updatePassword)).not.toBeCalled();
	});

	it("Should sign-out when pressing the button", async () => {
		// Arrange

		const Component = () => {
			const isSignedIn = useAppSelector(selectIsSignedIn);

			return isSignedIn && <Settings onClose={vi.fn()} />;
		};

		const { store } = renderWithProviders(<Component />, {
			preloadedState: {
				user: createInitialUserState({ isSignedIn: true }),
			},
		});

		// Act

		await userEvent.click(screen.getByText("Security"));
		await userEvent.click(screen.getByText("Sign-out"));

		// Assert

		expect(vi.mocked(signOut)).toBeCalled();
		expect(store.getState().user.isSignedIn).toBe(false);
	});

	it("Should show delete user dialog when button is pressed", async () => {
		// Arrange

		renderWithProviders(<Settings onClose={vi.fn()} />, {
			preloadedState: {
				user: createInitialUserState({ isSignedIn: true }),
			},
		});

		// Act

		await userEvent.click(screen.getByText("Security"));
		await userEvent.click(screen.getByText("Delete my account"));

		// Assert

		expect(screen.queryByText("Delete your account")).not.toBeNull();
	});

	it("Should show error message when passwords do not match", async () => {
		// Arrange

		renderWithProviders(<Settings onClose={vi.fn()} />, {
			preloadedState: {
				user: createInitialUserState({ isSignedIn: true }),
			},
		});

		// Act

		await userEvent.click(screen.getByText("Security"));

		await userEvent.click(screen.getByText("Current password"));
		await userEvent.keyboard("testPassword123");

		await userEvent.click(screen.getByText("New password"));
		await userEvent.keyboard("newPassword");

		await userEvent.click(screen.getByText("Confirm new password"));
		await userEvent.keyboard("newPassword123");

		await userEvent.click(screen.getByText("Apply"));

		// Assert

		expect(screen.queryByText("Passwords do not match!")).not.toBeNull();
		expect(vi.mocked(updatePassword)).not.toBeCalled();
	});

	it("Should update user passwords when input is given correctly", async () => {
		// Arrange

		renderWithProviders(<Settings onClose={vi.fn()} />, {
			preloadedState: {
				user: createInitialUserState({ isSignedIn: true }),
			},
		});

		// Act

		await userEvent.click(screen.getByText("Security"));

		await userEvent.click(screen.getByText("Current password"));
		await userEvent.keyboard("testPassword123");

		await userEvent.click(screen.getByText("New password"));
		await userEvent.keyboard("newPassword123");

		await userEvent.click(screen.getByText("Confirm new password"));
		await userEvent.keyboard("newPassword123");

		await userEvent.click(screen.getByText("Apply"));

		// Assert

		expect(vi.mocked(updatePassword)).toBeCalledWith(
			"testPassword123",
			"newPassword123",
		);
		expect(vi.mocked(updateUserInformation)).not.toBeCalled();
	});
});

describe("Appearance & Data tab", () => {
	it("Should apply updated settings", async () => {
		// Arrange

		const onCloseMock = vi.fn();
		const { store } = renderWithProviders(
			<Settings onClose={onCloseMock} />,
			{
				preloadedState: {
					settings: createInitialSettingsState(),
					user: createInitialUserState({
						isSignedIn: false,
					}),
				},
			},
		);

		// Act

		await userEvent.click(screen.getByText("Zoom", { exact: false }));
		await userEvent.keyboard("{backspace>100}120");

		await userEvent.click(screen.getByText("Data"));

		await userEvent.click(screen.getByText("Sync on startup and on close"));

		await userEvent.click(screen.getByText("Apply"));

		// Assert

		expect(store.getState().settings.settings?.zoomPercentage).toBe(120);
		expect(vi.mocked(updateSettings)).toBeCalledWith(
			expect.objectContaining({
				zoomPercentage: 120,
				autoSync: true,
			} as SettingsType),
		);

		expect(onCloseMock).toBeCalled();
	});

	it("Should not allow too small zoom", async () => {
		// Arrange

		const onCloseMock = vi.fn();
		renderWithProviders(<Settings onClose={onCloseMock} />, {
			preloadedState: {
				settings: createInitialSettingsState(),
			},
		});

		// Act

		await userEvent.click(screen.getByText("Zoom", { exact: false }));
		await userEvent.keyboard("{backspace>100}49");
		await userEvent.click(screen.getByText("Apply"));

		// Assert

		expect(
			screen.queryByText("Zoom percentage must be between", {
				exact: false,
			}),
		).not.toBeNull();
		expect(onCloseMock).not.toBeCalled();
	});
});
