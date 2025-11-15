import { getCurrentWebview, Webview } from "@tauri-apps/api/webview";
import { getSettings } from "../../../../api/settingsApi.ts";
import * as settingsApi from "../../../../api/settingsApi.ts";
import {
	initialLoadAndApplySettings,
	SETTINGS_CLOSE_REQUESTED_HANDLER_NAME,
	updateAndApplySettings,
} from "../../../../stores/settings/settingsActions.ts";
import Settings from "../../../../types/backend/model/settings.ts";
import { setSettings } from "../../../../stores/settings/settingsReducer.ts";
import { defaultCloseRequestedEventManager } from "../../../../managers/closeRequestedEventManager.ts";
import * as syncActions from "../../../../stores/sync/syncActions.ts";
import { RootState } from "../../../../stores/store.ts";

vi.mock(import("@tauri-apps/api/webview"));
vi.mock(import("../../../../api/settingsApi.ts"));
vi.mock(import("../../../../stores/sync/syncActions.ts"));
vi.mock(import("../../../../managers/closeRequestedEventManager.ts"));

const getAndSetDefaultSettings = () => {
	const settings: Settings = {
		autoSync: true,
		databaseLocation: "",
		theme: "Dark",
		zoomPercentage: 150,
	};
	const getSettingsMock = vi.mocked(getSettings);
	getSettingsMock.mockReturnValue(Promise.resolve(settings));
	return settings;
};

const createGetState = (isSignedIn = true) => {
	const state = {
		user: {
			isSignedIn,
		},
	} as RootState;

	return () => state;
};

describe("initialLoadAndApplySettings", () => {
	let setZoomMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		setZoomMock = vi.fn();
		vi.mocked(getCurrentWebview).mockReturnValue({
			setZoom: setZoomMock,
		} as Partial<Webview> as Webview);
	});

	it("Should load and apply settings works as expected", async () => {
		// Arrange

		const settings = getAndSetDefaultSettings();
		const addHandlerSpy = vi.spyOn(
			defaultCloseRequestedEventManager,
			"addHandler",
		);
		const removeHandlerSpy = vi.spyOn(
			defaultCloseRequestedEventManager,
			"removeHandler",
		);
		const dispatch = vi.fn();

		// Act

		const cb = initialLoadAndApplySettings();
		await cb(dispatch, createGetState());

		// Assert

		expect(dispatch).toBeCalledWith(setSettings(settings));
		expect(setZoomMock).toBeCalledWith(1.5);
		assert.isTrue(document.body.classList.contains("dark"));
		expect(removeHandlerSpy).toBeCalledWith(
			SETTINGS_CLOSE_REQUESTED_HANDLER_NAME,
		);
		expect(addHandlerSpy).toBeCalledWith(
			SETTINGS_CLOSE_REQUESTED_HANDLER_NAME,
			expect.anything(),
		);
	});

	it("Should remove dark theme class when settings uses light theme", async () => {
		// Arrange

		const settings = getAndSetDefaultSettings();
		document.body.classList.add("dark");
		settings.theme = "Light";
		const dispatch = vi.fn();

		// Act

		const cb = initialLoadAndApplySettings();
		await cb(dispatch, createGetState());

		// Assert

		expect(dispatch).toBeCalledWith(setSettings(settings));
		assert.isFalse(document.body.classList.contains("dark"));
	});

	it("Should use dark theme when system uses dark theme and current theme is to follow system", async () => {
		// Arrange

		const settings = getAndSetDefaultSettings();
		settings.theme = "FollowSystem";

		const matchMediaMock = vi.fn();
		matchMediaMock.mockReturnValue({
			matches: true,
		} as ReturnType<typeof window.matchMedia>);
		window.matchMedia = matchMediaMock;

		const dispatch = vi.fn();

		// Act

		const cb = initialLoadAndApplySettings();
		await cb(dispatch, createGetState());

		// Assert

		expect(dispatch).toBeCalledWith(setSettings(settings));
		assert.isTrue(document.body.classList.contains("dark"));
	});

	it("Should sync when user is signed in and auto sync is enabled", async () => {
		// Arrange

		const settings = getAndSetDefaultSettings();
		settings.autoSync = true;

		const syncSpy = vi.spyOn(syncActions, "sync");
		const dispatch = vi.fn();

		// Act

		const cb = initialLoadAndApplySettings();
		await cb(dispatch, createGetState());

		// Assert

		expect(syncSpy).toBeCalled();
	});

	it("Should not sync when user is not signed in", async () => {
		// Arrange

		const settings = getAndSetDefaultSettings();
		settings.autoSync = true;

		const addHandlerSpy = vi.spyOn(
			defaultCloseRequestedEventManager,
			"addHandler",
		);
		const syncSpy = vi.spyOn(syncActions, "sync");

		const dispatch = vi.fn();

		// Act

		const cb = initialLoadAndApplySettings();
		await cb(dispatch, createGetState(false));
		await addHandlerSpy.mock.calls[0][1].cb();

		// Assert

		expect(syncSpy).not.toBeCalled();
	});

	it("Should not sync when auto sync is disabled", async () => {
		// Arrange

		const settings = getAndSetDefaultSettings();
		settings.autoSync = false;

		const syncSpy = vi.spyOn(syncActions, "sync");
		const dispatch = vi.fn();

		// Act

		const cb = initialLoadAndApplySettings();
		await cb(dispatch, createGetState());

		// Assert

		expect(syncSpy).not.toBeCalled();
	});

	it("Should sync on close", async () => {
		// Arrange

		const settings = getAndSetDefaultSettings();
		settings.autoSync = true;
		const addHandlerSpy = vi.spyOn(
			defaultCloseRequestedEventManager,
			"addHandler",
		);

		const syncSpy = vi.spyOn(syncActions, "sync");
		const dispatch = vi.fn();

		// Act

		const cb = initialLoadAndApplySettings();
		await cb(dispatch, createGetState());
		await addHandlerSpy.mock.calls[0][1].cb();

		// Assert

		// First time on start and second time on close.
		expect(syncSpy).toBeCalledTimes(2);
	});

	it("Should not sync on close when auto sync is false", async () => {
		// Arrange

		const settings = getAndSetDefaultSettings();
		settings.autoSync = false;
		const addHandlerSpy = vi.spyOn(
			defaultCloseRequestedEventManager,
			"addHandler",
		);

		const syncSpy = vi.spyOn(syncActions, "sync");
		const dispatch = vi.fn();

		// Act

		const cb = initialLoadAndApplySettings();
		await cb(dispatch, createGetState());
		await addHandlerSpy.mock.calls[0][1].cb();

		// Assert

		expect(syncSpy).toBeCalledTimes(0);
	});
});

describe("updateAndApplySettings", () => {
	beforeEach(() => {
		vi.mocked(getCurrentWebview).mockReturnValue({
			setZoom: vi.fn(),
		} as Partial<Webview> as Webview);
	});

	it("Should update settings, apply them and then set the global state", async () => {
		// Arrange

		const settings = getAndSetDefaultSettings();
		const updateSettingsSpy = vi.spyOn(settingsApi, "updateSettings");
		const dispatch = vi.fn();

		// Act

		const cb = updateAndApplySettings(settings);
		await cb(dispatch, createGetState());

		// Assert

		expect(updateSettingsSpy).toBeCalled();
		expect(dispatch).toBeCalledWith(setSettings(settings));
		assert.isTrue(document.body.classList.contains("dark"));
	});
});
