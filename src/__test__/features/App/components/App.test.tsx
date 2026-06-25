import App from "../../../../features/App/components/App.tsx";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.tsx";
import useAppDispatch from "../../../../hooks/useAppDispatch.ts";
import { act, screen, waitFor } from "@testing-library/react";
import { Mock } from "vitest";
import { Procedure } from "@vitest/spy";
import userEvent from "@testing-library/user-event";
import { check, Update } from "@tauri-apps/plugin-updater";
import { ask } from "@tauri-apps/plugin-dialog";
import appStyles from "../../../../features/App/components/styles.module.css";
import sideBarStyles from "../../../../features/SideBar/components/styles.module.css";
import { SMALL_SCREEN_MAX_WIDTH_IN_PX } from "../../../../config/constants.ts";
import { getCurrentLocation } from "../../../test-utils/locationUtils.ts";
import { MemoryRouterProps } from "react-router";
import { RootState } from "../../../../stores/store.ts";
import { SettingsState } from "../../../../stores/settings/settingsReducer.ts";

vi.mock(import("../../../../hooks/useAppDispatch.ts"), () => ({
	default: vi.fn(),
}));
vi.mock(import("../../../../stores/user/userActions.ts"));
vi.mock(import("../../../../stores/settings/settingsActions.ts"));
vi.mock(import("../../../../stores/sync/syncActions.ts"));
vi.mock(import("../../../../managers/closeRequestedEventManager.ts"));
vi.mock(import("../../../../api/appInfo/api/appInfoApi.ts"), () => ({
	isStoreInstalled: () => Promise.resolve(false),
}));
vi.mock(import("../../../../utils/tauriUtils.ts"));
vi.mock(import("@tauri-apps/api/core"));
vi.mock(import("@tauri-apps/plugin-updater"));
vi.mock(import("@tauri-apps/plugin-dialog"));
vi.mock(import("@tauri-apps/plugin-process"));

function renderApp({
	memoryRouterProps = {} as MemoryRouterProps,
	preloadedState = {} as Partial<RootState>,
} = {}) {
	return renderWithProviders(<App />, {
		memoryRouterProps,
		preloadedState: {
			settings: {} as SettingsState,
			...preloadedState,
		},
	});
}

describe("App", () => {
	let dispatchMock: Mock<Procedure>;

	beforeEach(() => {
		dispatchMock = vi.fn();
		vi.mocked(useAppDispatch).mockReturnValue(dispatchMock);
	});

	it("Should prevent default when opening context menu on production", async () => {
		// Arrange

		vi.stubEnv("DEV", false);
		const event = new MouseEvent("contextmenu");
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		renderApp();

		// Act

		await act(() => {
			window.dispatchEvent(event);
			return Promise.resolve();
		});

		// Assert

		expect(preventDefaultSpy).toHaveBeenCalled();
	});

	it("Should not prevent default when opening context menu on development", async () => {
		// Arrange

		vi.stubEnv("DEV", true);
		const event = new MouseEvent("contextmenu");
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		renderApp();

		// Act

		await act(() => {
			window.dispatchEvent(event);
			return Promise.resolve();
		});

		// Assert

		expect(preventDefaultSpy).not.toHaveBeenCalled();
	});

	it("Should prevent default when pressing F5", async () => {
		// Arrange

		const event = new KeyboardEvent("keydown", {
			key: "F5",
		});
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		renderApp();

		// Act

		await act(() => {
			window.dispatchEvent(event);
			return Promise.resolve();
		});

		// Assert

		expect(preventDefaultSpy).toHaveBeenCalled();
	});

	it("Should prevent default when pressing Ctrl + F", async () => {
		// Arrange

		const event = new KeyboardEvent("keydown", {
			ctrlKey: true,
			key: "F",
		});
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		renderApp();

		// Act

		await act(() => {
			window.dispatchEvent(event);
			return Promise.resolve();
		});

		// Assert

		expect(preventDefaultSpy).toHaveBeenCalled();
	});

	it("Should prevent default when pressing Ctrl + R", async () => {
		// Arrange

		const event = new KeyboardEvent("keydown", {
			ctrlKey: true,
			key: "R",
		});
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		renderApp();

		// Act

		await act(() => {
			window.dispatchEvent(event);
			return Promise.resolve();
		});

		// Assert

		expect(preventDefaultSpy).toHaveBeenCalled();
	});

	it("Should navigate to home on shortcut", async () => {
		// Arrange

		renderApp();

		// Act

		await userEvent.keyboard("{Control>}h");

		// Assert

		expect(await getCurrentLocation()).toBe("/home");
	});

	it("Should render updater", async () => {
		// Arrange

		const update = new Update({
			version: "",
			currentVersion: "",
			rawJson: {},
			rid: 1,
		});

		const downloadAndInstallMock = vi.fn();
		update.downloadAndInstall = downloadAndInstallMock;
		downloadAndInstallMock.mockImplementation(async () => {
			// Adding some delays so that the dialog is hidden right away.
			await new Promise(resolve => setTimeout(resolve, 200));
		});

		vi.mocked(check).mockResolvedValue(update);
		vi.mocked(ask).mockResolvedValue(true);

		// Act

		renderApp();

		// Assert

		await waitFor(() => {
			expect(
				screen.queryByText("Updating the application", {
					exact: false,
				}),
			).not.toBeNull();
		});
	});

	it("Should hide updating dialog and show error when update fails", async () => {
		// Arrange

		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {
				/* Suppressing stderr output */
			});

		const update = new Update({
			version: "",
			currentVersion: "",
			rawJson: {},
			rid: 1,
		});

		const downloadAndInstallMock = vi.fn();
		update.downloadAndInstall = downloadAndInstallMock;
		downloadAndInstallMock.mockRejectedValueOnce(
			new Error("Download failed"),
		);

		vi.mocked(check).mockResolvedValue(update);
		vi.mocked(ask).mockResolvedValue(true);

		// Act

		renderApp();

		// Assert

		await waitFor(() => {
			expect(
				screen.queryByText("Updating the application", {
					exact: false,
				}),
			).toBeNull();
			expect(
				screen.queryByText("Download failed", { exact: false }),
			).not.toBeNull();
		});

		consoleError.mockRestore();
	});

	it("Should not render sidebar when it is collapsed", async () => {
		// Arrange

		renderApp();

		// Act

		await userEvent.keyboard("{Control>}\\");

		// Assert

		const sideBar = screen.getByRole("complementary");
		expect(sideBar.className).toContain(sideBarStyles.closed);
	});

	it("Should add hidden class on work-area when screen is small and sidebar is expanded", async () => {
		// Arrange

		window.innerWidth = SMALL_SCREEN_MAX_WIDTH_IN_PX;

		// Act

		const { container } = renderApp();
		// Sidebar is collapsed by default on small screen.
		await userEvent.keyboard("{Control>}\\");

		// Assert

		await waitFor(() => {
			expect(
				container.getElementsByClassName(appStyles.hidden).length,
			).toBe(1);
		});
	});

	it("Should not add hidden class on work-area when screen is not small and sidebar is expanded", async () => {
		// Arrange

		window.innerWidth = SMALL_SCREEN_MAX_WIDTH_IN_PX + 1;

		// Act

		const { container } = renderApp();

		// Assert

		await waitFor(() => {
			expect(
				container.getElementsByClassName(appStyles.hidden).length,
			).toBe(0);
		});
	});

	it("Should not add hidden class on work-area when screen is small and sidebar is not expanded", async () => {
		// Arrange

		window.innerWidth = SMALL_SCREEN_MAX_WIDTH_IN_PX;

		// Act

		// Sidebar is collapsed by default on small screen.
		const { container } = renderApp();

		// Assert

		await waitFor(() => {
			expect(
				container.getElementsByClassName(appStyles.hidden).length,
			).toBe(0);
		});
	});
});
