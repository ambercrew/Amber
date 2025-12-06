import App from "../../app/App";
import { renderWithProviders } from "../test-utils/renderWithProviders";
import useAppDispatch from "../../hooks/useAppDispatch";
import { getReviewTreeFolderForRoot } from "../../stores/fileSystem/fileSystemActions";
import { screen, waitFor } from "@testing-library/react";
import { loadInitialStateUser } from "../../stores/user/userActions";
import { initialLoadAndApplySettings } from "../../stores/settings/settingsActions";
import { Mock } from "vitest";
import { Procedure } from "@vitest/spy";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../stores/sync/managers/syncEventManager";
import { createMemoryHistory } from "history";
import userEvent from "@testing-library/user-event";
import { Router } from "react-router";

vi.mock("../../hooks/useAppDispatch", () => ({
	default: vi.fn(),
}));

vi.mock("../../stores/fileSystem/fileSystemActions");
vi.mock("../../stores/user/userActions");
vi.mock("../../stores/settings/settingsActions");

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
		vi.mocked(loadInitialStateUser).mockReturnValue(expectedLoadSettingsCb);

		const expectedInitiateSettings = vi.fn();
		vi.mocked(initialLoadAndApplySettings).mockReturnValue(
			expectedInitiateSettings,
		);

		// Act

		renderWithProviders(<App />);

		// Assert

		await waitFor(() => {
			expect(dispatchMock).toBeCalledWith(expectedReviewTreeCb);
			expect(dispatchMock).toBeCalledWith(expectedLoadSettingsCb);
			expect(dispatchMock).toBeCalledWith(expectedInitiateSettings);
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
			expect(times).toBe(2);
		});
	});

	it("Should navigate to home on shortcut", async () => {
		// Arrange

		const { history } = renderWithProviders(<App />);

		// Act

		await userEvent.keyboard("{Control>}h");

		// Assert

		expect(history.location.pathname).toBe("/home");
	});
});
