import App from "../../../../features/App/components/App.tsx";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.tsx";
import useAppDispatch from "../../../../hooks/useAppDispatch.ts";
import { getReviewTreeFolderForRoot } from "../../../../stores/fileSystem/fileSystemActions.ts";
import { act, screen, waitFor } from "@testing-library/react";
import { Mock } from "vitest";
import { Procedure } from "@vitest/spy";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../../stores/sync/managers/syncEventManager.ts";
import userEvent from "@testing-library/user-event";
import { check, Update } from "@tauri-apps/plugin-updater";
import { ask } from "@tauri-apps/plugin-dialog";
import appStyles from "../../../../features/App/components/styles.module.css";
import sideBarStyles from "../../../../features/SideBar/components/styles.module.css";
import homeStyles from "../../../../features/Home/components/styles.module.css";
import editorStyles from "../../../../features/Editor/components/styles.module.css";
import reviewerStyles from "../../../../features/Reviewer/components/styles.module.css";
import searcherStyles from "../../../../features/Searcher/components/styles.module.css";
import { SMALL_SCREEN_MAX_WIDTH_IN_PX } from "../../../../config/constants.ts";
import { getCurrentLocation } from "../../../test-utils/locationUtils.ts";
import { MemoryRouterProps } from "react-router";
import { RootState } from "../../../../stores/store.ts";
import { SettingsState } from "../../../../stores/settings/settingsReducer.ts";

vi.mock(import("../../../../hooks/useAppDispatch.ts"), () => ({
	default: vi.fn(),
}));
vi.mock(import("../../../../stores/fileSystem/fileSystemActions.ts"));
vi.mock(import("../../../../stores/user/userActions.ts"));
vi.mock(import("../../../../stores/settings/settingsActions.ts"));
vi.mock(import("../../../../stores/sync/syncActions.ts"));
vi.mock(import("../../../../managers/closeRequestedEventManager.ts"));
vi.mock(import("../../../../features/Editor/components/TitleBar.tsx"));
vi.mock(import("../../../../api/cells/api/cellApi.ts"), () => ({
	getCellsForFilesWithFsrsProfileIds: () => Promise.resolve([]),
	getFileCellsOrderedByIndex: () => Promise.resolve([]),
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

	it("Should get new file tree when sync complete", async () => {
		// Arrange

		const expectedReviewTreeCb = vi.fn();
		vi.mocked(getReviewTreeFolderForRoot).mockReturnValue(
			expectedReviewTreeCb,
		);
		renderApp();
		// Waiting for async callback to finish.
		await act(async () => {
			/* Nothing */
		});
		const beforeTimes = dispatchMock.mock.calls.filter(
			c => c[0] === expectedReviewTreeCb,
		).length;

		// Act

		await act(async () => {
			await defaultGlobalSyncEventManager.notifyListeners(
				ListenerType.PostSyncComplete,
			);
		});

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

		renderApp();

		// Act

		await userEvent.keyboard("{Control>}h");

		// Assert

		expect(await getCurrentLocation()).toBe("/home");
	});

	it("Should render updater", async () => {
		// Arrange

		vi.mocked(check).mockResolvedValue(
			new Update({
				version: "",
				currentVersion: "",
				rawJson: {},
				rid: 1,
			}),
		);
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

	it("Should not render sidebar when it is collapsed", async () => {
		// Arrange

		renderApp();

		// Act

		await userEvent.keyboard("{Control>}\\");

		// Assert

		const sideBar = screen.getByRole("complementary");
		expect(sideBar.className).toContain(sideBarStyles.closed);
	});

	it("Should render home when on /home", async () => {
		// Act

		const { container } = renderApp({
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

		const { container } = renderApp({
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

		const { container } = renderApp({
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

		const { container } = renderApp({
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

		const { container } = renderApp();

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
		const { container } = renderApp();

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
		renderApp();

		// Act
		await waitFor(async () => {
			await userEvent.click(screen.getByText("Search"));

			// Assert

			const sideBar = screen.getByRole("complementary");
			expect(sideBar.className).toContain(sideBarStyles.closed);
		});
	});
});
