import App from "../../app/App";
import { renderWithProviders } from "../test-utils/renderWithProviders";
import useAppDispatch from "../../hooks/useAppDispatch";
import { getReviewTreeFolderForRoot } from "../../stores/fileSystem/fileSystemActions";
import { screen, waitFor } from "@testing-library/react";
import { loadInitialUserState } from "../../stores/user/userActions";
import { initialLoadAndApplySettings } from "../../stores/settings/settingsActions";
import { Mock } from "vitest";
import { Procedure } from "@vitest/spy";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../stores/sync/managers/syncEventManager";
import userEvent from "@testing-library/user-event";
import { check, Update } from "@tauri-apps/plugin-updater";
import { ask } from "@tauri-apps/plugin-dialog";
import appStyles from "../../app/styles.module.css";
import sideBarStyles from "../../features/SideBar/components/styles.module.css";
import homeStyles from "../../features/Home/components/styles.module.css";
import editorStyles from "../../features/Editor/components/styles.module.css";
import reviewerStyles from "../../features/Reviewer/components/styles.module.css";
import searcherStyles from "../../features/Searcher/components/styles.module.css";
import { SMALL_SCREEN_MAX_WIDTH_IN_PX } from "../../config/constants";
import { sync } from "../../stores/sync/syncActions";
import Settings from "../../types/backend/model/settings";

vi.mock(import("../../hooks/useAppDispatch"), () => ({
	default: vi.fn(),
}));
vi.mock(import("../../stores/fileSystem/fileSystemActions"));
vi.mock(import("../../stores/user/userActions"));
vi.mock(import("../../stores/settings/settingsActions"));
vi.mock(import("../../stores/sync/syncActions"));
vi.mock(import("../../managers/closeRequestedEventManager"));
vi.mock(import("../../api/cellApi.ts"), () => ({
	getCellsForFiles: () => Promise.resolve([]),
}));
vi.mock(import("@tauri-apps/api/core"));
vi.mock(import("@tauri-apps/plugin-updater"));
vi.mock(import("@tauri-apps/plugin-dialog"));
vi.mock(import("@tauri-apps/plugin-process"));

describe("App", () => {
	let dispatchMock: Mock<Procedure>;

	beforeEach(() => {
		dispatchMock = vi.fn();
		const useAppDispatchMock = vi.mocked(useAppDispatch);
		vi.mocked(useAppDispatchMock).mockReturnValue(dispatchMock);
	});

	it("Should load initial state", async () => {
		// Arrange

		const expectedReviewTreeCb = vi.fn();
		vi.mocked(getReviewTreeFolderForRoot).mockReturnValue(
			expectedReviewTreeCb,
		);

		const expectedLoadSettingsCb = vi.fn();
		vi.mocked(loadInitialUserState).mockReturnValue(expectedLoadSettingsCb);

		const expectedInitiateSettings = vi.fn();
		vi.mocked(initialLoadAndApplySettings).mockReturnValue(
			expectedInitiateSettings,
		);
		dispatchMock.mockImplementation(cb => {
			if (cb === expectedInitiateSettings) {
				return Promise.resolve({
					autoSync: true,
				} as Partial<Settings>);
			}
		});

		const expectedSync = vi.fn();
		vi.mocked(sync).mockReturnValue(expectedSync);

		// Act

		renderWithProviders(<App />);

		// Assert

		await waitFor(() => {
			expect(dispatchMock).toBeCalledWith(expectedReviewTreeCb);
			expect(dispatchMock).toBeCalledWith(expectedLoadSettingsCb);
			expect(dispatchMock).toBeCalledWith(expectedInitiateSettings);
			expect(dispatchMock).toBeCalledWith(expectedSync);
		});
	});

	it("Should not auto-sync on start if it is not enabled", async () => {
		// Arrange

		const expectedInitiateSettings = vi.fn();
		vi.mocked(initialLoadAndApplySettings).mockReturnValue(
			expectedInitiateSettings,
		);
		dispatchMock.mockImplementation(cb => {
			if (cb === expectedInitiateSettings) {
				return Promise.resolve({
					autoSync: false,
				} as Partial<Settings>);
			}
		});

		const expectedSync = vi.fn();
		vi.mocked(sync).mockReturnValue(expectedSync);

		// Act

		renderWithProviders(<App />);
		await Promise.resolve();

		// Assert

		await waitFor(() => {
			expect(dispatchMock).toBeCalledWith(expectedInitiateSettings);
			expect(dispatchMock).not.toBeCalledWith(expectedSync);
		});
	});

	it("Should prevent default when opening context menu on production", () => {
		// Arrange

		vi.stubEnv("DEV", false);
		const event = new MouseEvent("contextmenu");
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		renderWithProviders(<App />);

		// Act

		window.dispatchEvent(event);

		// Assert

		expect(preventDefaultSpy).toHaveBeenCalled();
	});

	it("Should not prevent default when opening context menu on development", () => {
		// Arrange

		vi.stubEnv("DEV", true);
		const event = new MouseEvent("contextmenu");
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		renderWithProviders(<App />);

		// Act

		window.dispatchEvent(event);

		// Assert

		expect(preventDefaultSpy).not.toHaveBeenCalled();
	});

	it("Should prevent default when pressing F5", () => {
		// Arrange

		const event = new KeyboardEvent("keydown", {
			key: "F5",
		});
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		renderWithProviders(<App />);

		// Act

		window.dispatchEvent(event);

		// Assert

		expect(preventDefaultSpy).toHaveBeenCalled();
	});

	it("Should prevent default when pressing Ctrl + F", () => {
		// Arrange

		const event = new KeyboardEvent("keydown", {
			ctrlKey: true,
			key: "F",
		});
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		renderWithProviders(<App />);

		// Act

		window.dispatchEvent(event);

		// Assert

		expect(preventDefaultSpy).toHaveBeenCalled();
	});

	it("Should prevent default when pressing Ctrl + R", () => {
		// Arrange

		const event = new KeyboardEvent("keydown", {
			ctrlKey: true,
			key: "R",
		});
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		renderWithProviders(<App />);

		// Act

		window.dispatchEvent(event);

		// Assert

		expect(preventDefaultSpy).toHaveBeenCalled();
	});

	it("Should get new file tree when sync complete", async () => {
		// Arrange

		const expectedReviewTreeCb = vi.fn();
		vi.mocked(getReviewTreeFolderForRoot).mockReturnValue(
			expectedReviewTreeCb,
		);
		renderWithProviders(<App />);
		// Waiting for async callback to finish.
		await Promise.resolve();
		const beforeTimes = dispatchMock.mock.calls.filter(
			c => c[0] === expectedReviewTreeCb,
		).length;

		// Act

		await defaultGlobalSyncEventManager.notifyListeners(
			ListenerType.PostSyncComplete,
		);

		// Assert

		await waitFor(() => {
			const times = dispatchMock.mock.calls.filter(
				c => c[0] === expectedReviewTreeCb,
			).length;
			// Two times since it should get on the initial render.
			expect(times).toBe(beforeTimes + 1);
		});
	});

	it("Should navigate to home on shortcut", async () => {
		// Arrange

		renderWithProviders(<App />);

		// Act

		await userEvent.keyboard("{Control>}h");

		// Assert

		expect(screen.getByTestId("location-display")).toHaveTextContent(
			"/home",
		);
	});

	it("Should render updater", async () => {
		// Arrange

		vi.mocked(check).mockReturnValue(
			Promise.resolve(
				new Update({
					version: "",
					currentVersion: "",
					rawJson: {},
					rid: 1,
				}),
			),
		);
		vi.mocked(ask).mockReturnValue(Promise.resolve(true));

		// Act

		renderWithProviders(<App />);

		// Assert

		await waitFor(() => {
			expect(
				screen.queryByText("Updating the application", {
					exact: false,
				}),
			).not.toBeNull();
		});
	});

	it("Should not render sidebar when it is collapsed", async () => {
		// Arrange

		renderWithProviders(<App />);

		// Act

		await userEvent.keyboard("{Control>}\\");

		// Assert

		const sideBar = screen.getByRole("complementary");
		expect(sideBar.className).toContain(sideBarStyles.closed);
	});

	it("Should render home when on /home", async () => {
		// Act

		const { container } = renderWithProviders(<App />, {
			memoryRouterProps: {
				initialEntries: ["/home"],
			},
		});

		// Assert

		await waitFor(() => {
			expect(
				container.getElementsByClassName(homeStyles.home).length,
			).toBe(1);
		});
	});

	it("Should render editor when on /editor", async () => {
		// Act

		const { container } = renderWithProviders(<App />, {
			memoryRouterProps: {
				initialEntries: ["/editor"],
			},
		});

		// Assert

		await waitFor(() => {
			expect(
				container.getElementsByClassName(editorStyles.container).length,
			).toBe(1);
		});
	});

	it("Should render reviewer when on /reviewer", async () => {
		// Act

		const { container } = renderWithProviders(<App />, {
			memoryRouterProps: {
				initialEntries: ["/reviewer"],
			},
		});

		// Assert

		await waitFor(() => {
			expect(
				container.getElementsByClassName(reviewerStyles.reviewer)
					.length,
			).toBe(1);
		});
	});

	it("Should render searcher when on /search", async () => {
		// Act

		const { container } = renderWithProviders(<App />, {
			memoryRouterProps: {
				initialEntries: ["/search"],
			},
		});

		// Assert

		await waitFor(() => {
			expect(
				container.getElementsByClassName(searcherStyles.container)
					.length,
			).toBe(1);
		});
	});

	it("Should add hidden class on work-area when screen is small and sidebar is expanded", async () => {
		// Arrange

		window.innerWidth = SMALL_SCREEN_MAX_WIDTH_IN_PX;

		// Act

		const { container } = renderWithProviders(<App />);

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

		const { container } = renderWithProviders(<App />);

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
		const { container } = renderWithProviders(<App />);

		// Act

		await userEvent.keyboard("{Control>}\\");

		// Assert

		await waitFor(() => {
			expect(
				container.getElementsByClassName(appStyles.hidden).length,
			).toBe(0);
		});
	});

	it("Should collapse sidebar when navigating on small screen", async () => {
		// Arrange

		window.innerWidth = SMALL_SCREEN_MAX_WIDTH_IN_PX;
		renderWithProviders(<App />);

		// Act
		await waitFor(async () => {
			await userEvent.click(screen.getByText("Search"));

			// Assert

			const sideBar = screen.getByRole("complementary");
			expect(sideBar.className).toContain(sideBarStyles.closed);
		});
	});
});
