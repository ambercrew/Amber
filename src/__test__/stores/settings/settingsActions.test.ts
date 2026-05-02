import { getCurrentWebview, Webview } from "@tauri-apps/api/webview";
import { getSettings } from "../../../api/settings/api/settingsApi.ts";
import * as settingsApi from "../../../api/settings/api/settingsApi.ts";
import {
	loadAndApplySettings,
	SETTINGS_CLOSE_REQUESTED_HANDLER_NAME,
	updateAndApplySettings,
} from "../../../stores/settings/settingsActions.ts";
import UpdateSettingsRequestDto from "../../../api/settings/dto/updateSettingsRequestDto.ts";
import { setSettings } from "../../../stores/settings/settingsReducer.ts";
import { defaultCloseRequestedEventManager } from "../../../managers/closeRequestedEventManager.ts";
import * as syncActions from "../../../stores/sync/syncActions.ts";
import { Window } from "@tauri-apps/api/window";
import { type } from "@tauri-apps/plugin-os";

vi.mock(import("@tauri-apps/api/webview"));
vi.mock(import("../../../api/settings/api/settingsApi.ts"));
vi.mock(import("../../../stores/sync/syncActions.ts"));
vi.mock(import("../../../managers/closeRequestedEventManager.ts"));
vi.mock(import("@tauri-apps/plugin-os"));

const getAndSetDefaultSettings = () => {
	const settings: UpdateSettingsRequestDto = {
		autoSync: true,
		baseDatabaseDirectory: "",
		theme: "Dark",
		zoomPercentage: 150,
		enableAi: true,
		ollamaModelName: "",
		ollamaEmbeddingsModelName: "",
	};
	const getSettingsMock = vi.mocked(getSettings);
	getSettingsMock.mockResolvedValue(settings);
	return settings;
};

describe("initialLoadAndApplySettings", () => {
	let setZoomMock: ReturnType<typeof vi.fn>;
	let setThemeMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.mocked(type).mockReturnValue("windows");

		setZoomMock = vi.fn();
		setThemeMock = vi.fn();

		vi.mocked(getCurrentWebview).mockReturnValue({
			setZoom: setZoomMock,
			window: {
				setTheme: setThemeMock,
			} as Partial<Window>,
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

		const cb = loadAndApplySettings();
		await cb(dispatch);

		// Assert

		expect(dispatch).toHaveBeenCalledWith(setSettings(settings));
		expect(setZoomMock).toHaveBeenCalledWith(1.5);
		expect(setThemeMock).toHaveBeenCalledWith("dark");
		expect(document.body.classList.contains("dark")).toBe(true);
		expect(removeHandlerSpy).toHaveBeenCalledWith(
			SETTINGS_CLOSE_REQUESTED_HANDLER_NAME,
		);
		expect(addHandlerSpy).toHaveBeenCalledWith(
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

		const cb = loadAndApplySettings();
		await cb(dispatch);

		// Assert

		expect(dispatch).toHaveBeenCalledWith(setSettings(settings));
		expect(document.body.classList.contains("dark")).toBe(false);
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

		const cb = loadAndApplySettings();
		await cb(dispatch);

		// Assert

		expect(dispatch).toHaveBeenCalledWith(setSettings(settings));
		expect(document.body.classList.contains("dark")).toBe(true);
		expect(setThemeMock).toHaveBeenCalledWith(null);
		expect(setThemeMock).toHaveBeenCalledWith("dark");
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

		const cb = loadAndApplySettings();
		await cb(dispatch);
		await addHandlerSpy.mock.calls[0][1].cb();

		// Assert

		expect(syncSpy).toHaveBeenCalledTimes(1);
	});

	it("Should not sync on close when auto-sync is false", async () => {
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

		const cb = loadAndApplySettings();
		await cb(dispatch);
		await addHandlerSpy.mock.calls[0][1].cb();

		// Assert

		expect(syncSpy).toHaveBeenCalledTimes(0);
	});
});

describe("updateAndApplySettings", () => {
	beforeEach(() => {
		vi.mocked(type).mockReturnValue("windows");
	});

	it("Should update settings, apply them and then set the global state", async () => {
		// Arrange

		const settings = getAndSetDefaultSettings();
		const updateSettingsSpy = vi.spyOn(settingsApi, "updateSettings");
		const dispatch = vi.fn();

		// Act

		const cb = updateAndApplySettings({
			...settings,
		});
		await cb(dispatch);

		// Assert

		expect(updateSettingsSpy).toHaveBeenCalled();
		expect(dispatch).toHaveBeenCalledWith(setSettings(settings));
		expect(document.body.classList.contains("dark")).toBe(true);
	});

	it("Should add no-transition class when updating settings then remove it", async () => {
		// Arrange

		const settings = getAndSetDefaultSettings();

		const setThemeMock = vi.fn();
		setThemeMock.mockImplementation(() => {
			// Asserting the no-transition class when applying the theme, no other way to do that.
			expect(document.body.classList.contains("no-transition")).toBe(
				true,
			);
		});

		vi.mocked(getCurrentWebview).mockReturnValue({
			setZoom: vi.fn(),
			window: {
				setTheme: setThemeMock,
			} as Partial<Window>,
		} as Partial<Webview> as Webview);

		const dispatch = vi.fn();

		// Act

		const cb = updateAndApplySettings({
			...settings,
		});
		await cb(dispatch);

		// Assert

		expect(dispatch).toHaveBeenCalledWith(setSettings(settings));
		expect(document.body.classList.contains("no-transition")).toBe(false);
	});

	it("Should add mobile class when on mobile", async () => {
		// Arrange

		const settings = getAndSetDefaultSettings();
		vi.mocked(type).mockReturnValue("android");

		const dispatch = vi.fn();

		// Act

		const cb = updateAndApplySettings({
			...settings,
		});
		await cb(dispatch);

		// Assert

		expect(document.body.classList.contains("mobile")).toBe(true);
	});

	it("Should not add mobile class when on mobile", async () => {
		// Arrange

		const settings = getAndSetDefaultSettings();
		vi.mocked(type).mockReturnValue("linux");

		const dispatch = vi.fn();

		// Act

		const cb = updateAndApplySettings({
			...settings,
		});
		await cb(dispatch);

		// Assert

		expect(document.body.classList.contains("mobile")).toBe(false);
	});
});
