import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.tsx";
import { screen } from "@testing-library/react";
import {
	getUserInformation,
	updateUserInformation,
} from "../../../../api/backend/api/userApi.ts";
import { UserInformationDto } from "../../../../api/backend/dto/userInformationDto.ts";
import {
	signOut,
	updatePassword,
} from "../../../../api/backend/api/authApi.ts";
import { UserState } from "../../../../stores/user/userReducer.ts";
import useAppSelector from "../../../../hooks/useAppSelector.ts";
import { selectIsSignedIn } from "../../../../stores/user/userSelectors.ts";
import Settings from "../../../../features/Settings/components/Settings.tsx";
import {
	getSettings,
	updateSettings,
} from "../../../../api/settings/api/settingsApi.ts";
import { SettingsState } from "../../../../stores/settings/settingsReducer.ts";
import { Window } from "@tauri-apps/api/window";
import { Webview } from "@tauri-apps/api/webview";
import { isMobile } from "../../../../utils/tauriUtils.ts";
import UpdateSettingsRequestDto from "../../../../api/settings/dto/updateSettingsRequestDto.ts";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentLocation } from "../../../test-utils/locationUtils.ts";

vi.mock(import("../../../../api/backend/api/authApi.ts"));
vi.mock(import("../../../../api/fileSystem/api/fileSystemApi.ts"));
vi.mock(import("../../../../api/backend/api/userApi.ts"));
vi.mock(
	import("../../../../api/settings/api/settingsApi.ts"),
	async importOriginal => {
		const getSettings = vi.fn();
		getSettings.mockResolvedValue({} as UpdateSettingsRequestDto);

		return {
			...(await importOriginal()),
			getSettings,
			updateSettings: vi.fn(),
		};
	},
);
vi.mock(import("../../../../managers/closeRequestedEventManager.ts"));
vi.mock(import("../../../../utils/tauriUtils.ts"));
vi.mock(import("@tauri-apps/plugin-dialog"));
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
		settings: {} as UpdateSettingsRequestDto,
	} as SettingsState;
};

describe("Profile & Security tab", () => {
	it("Should update user information when submitting", async () => {
		// Arrange

		vi.mocked(getUserInformation).mockResolvedValue({
			firstName: "New first name",
			lastName: "New last name",
		} as Partial<UserInformationDto> as UserInformationDto);

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

		expect(vi.mocked(updateUserInformation)).toHaveBeenCalledWith(
			"New first name",
			"New last name",
		);
		expect(vi.mocked(updatePassword)).not.toHaveBeenCalled();

		expect(onCloseMock).toHaveBeenCalled();

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

		expect(vi.mocked(updateUserInformation)).not.toHaveBeenCalled();
		expect(vi.mocked(updatePassword)).not.toHaveBeenCalled();
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

		expect(vi.mocked(signOut)).toHaveBeenCalled();
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
		expect(vi.mocked(updatePassword)).not.toHaveBeenCalled();
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

		expect(vi.mocked(updatePassword)).toHaveBeenCalledWith(
			"testPassword123",
			"newPassword123",
		);
		expect(vi.mocked(updateUserInformation)).not.toHaveBeenCalled();
	});
});

describe("AI tab", () => {
	it("Should show Ollama-specific fields when provider is Ollama", async () => {
		// Arrange

		renderWithProviders(<Settings onClose={vi.fn()} />, {
			preloadedState: {
				settings: {
					settings: {
						aiProvider: "ollama",
						ollama: { modelName: null, embeddingsModelName: null },
						openai: { modelName: null, embeddingsModelName: null },
					} as UpdateSettingsRequestDto,
				} as SettingsState,
				user: createInitialUserState({ isSignedIn: false }),
			},
		});

		// Act

		await userEvent.click(screen.getByText("AI"));

		// Assert

		expect(screen.queryByText("Ollama model name")).not.toBeNull();
		expect(
			screen.queryByText("Ollama embeddings model name"),
		).not.toBeNull();
		expect(screen.queryByText("OpenAI model name")).toBeNull();
		expect(screen.queryByText("OpenAI embeddings model name")).toBeNull();
		expect(screen.queryByText("OpenAI API key")).toBeNull();
	});

	it("Should show OpenAI-specific fields when provider is OpenAI", async () => {
		// Arrange

		renderWithProviders(<Settings onClose={vi.fn()} />, {
			preloadedState: {
				settings: {
					settings: {
						aiProvider: "openAI",
						ollama: { modelName: null, embeddingsModelName: null },
						openai: { modelName: null, embeddingsModelName: null },
					} as UpdateSettingsRequestDto,
				} as SettingsState,
				user: createInitialUserState({ isSignedIn: false }),
			},
		});

		// Act

		await userEvent.click(screen.getByText("AI"));

		// Assert

		expect(screen.queryByText("OpenAI model name")).not.toBeNull();
		expect(
			screen.queryByText("OpenAI embeddings model name"),
		).not.toBeNull();
		expect(screen.queryByText("OpenAI API key")).not.toBeNull();
		expect(screen.queryByText("Ollama model name")).toBeNull();
		expect(screen.queryByText("Ollama embeddings model name")).toBeNull();
	});

	it("Should show OpenAI-specific fields after switching provider to OpenAI", async () => {
		// Arrange

		renderWithProviders(<Settings onClose={vi.fn()} />, {
			preloadedState: {
				settings: {
					settings: {
						aiProvider: "ollama",
						ollama: { modelName: null, embeddingsModelName: null },
						openai: { modelName: null, embeddingsModelName: null },
					} as UpdateSettingsRequestDto,
				} as SettingsState,
				user: createInitialUserState({ isSignedIn: false }),
			},
		});

		await userEvent.click(screen.getByText("AI"));

		// Act

		await userEvent.click(screen.getByTitle("Ollama"));
		await userEvent.click(screen.getByTitle("OpenAI"));

		// Assert

		expect(screen.queryByText("OpenAI model name")).not.toBeNull();
		expect(screen.queryByText("OpenAI API key")).not.toBeNull();
		expect(screen.queryByText("Ollama model name")).toBeNull();
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

		vi.mocked(getSettings).mockResolvedValue({
			zoomPercentage: 120,
		} as UpdateSettingsRequestDto);

		// Act

		await userEvent.click(screen.getByText("Zoom", { exact: false }));
		await userEvent.keyboard("{backspace>100}120");

		await userEvent.click(screen.getByText("Data"));

		await userEvent.click(screen.getByText("Sync on startup and on close"));

		await userEvent.click(screen.getByText("Apply"));

		// Assert

		expect(store.getState().settings.settings?.zoomPercentage).toBe(120);
		expect(vi.mocked(updateSettings)).toHaveBeenCalledWith(
			expect.objectContaining({
				zoomPercentage: 120,
				autoSync: true,
			} as UpdateSettingsRequestDto),
		);

		expect(onCloseMock).toHaveBeenCalled();
	});

	it("Should refresh when updating database location", async () => {
		// Arrange

		const onCloseMock = vi.fn();
		renderWithProviders(<Settings onClose={onCloseMock} />, {
			memoryRouterProps: {
				initialEntries: ["/reviewer"],
			},
			preloadedState: {
				settings: createInitialSettingsState(),
				user: createInitialUserState({
					isSignedIn: false,
				}),
			},
		});

		vi.mocked(open).mockResolvedValue("new location");

		// Act

		await userEvent.click(screen.getByText("Data"));
		await userEvent.click(screen.getByTitle("Change database directory"));
		await userEvent.click(screen.getByText("Apply"));

		// Assert

		expect(await getCurrentLocation()).toBe("/");
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
		expect(onCloseMock).not.toHaveBeenCalled();
	});

	it("Should be able to set zoom on mobile", () => {
		// Arrange

		vi.mocked(isMobile).mockReturnValue(true);
		renderWithProviders(<Settings onClose={vi.fn()} />, {
			preloadedState: {
				settings: createInitialSettingsState(),
			},
		});

		// Act

		const element = screen.queryByText("Zoom", { exact: false });

		// Assert

		expect(element).toBeNull();
	});
});
