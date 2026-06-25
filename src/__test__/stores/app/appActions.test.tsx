import { loadUserState } from "../../../stores/user/userActions.ts";
import { loadAndApplySettings } from "../../../stores/settings/settingsActions.ts";
import { sync } from "../../../stores/sync/syncActions.ts";
import UpdateSettingsRequestDto from "../../../api/settings/dto/updateSettingsRequestDto.ts";
import { Mock } from "vitest";
import { Procedure } from "@vitest/spy";
import useAppDispatch from "../../../hooks/useAppDispatch.ts";
import { initialLoadApplicationState } from "../../../stores/app/appActions.ts";
import { RootState } from "../../../stores/store.ts";
import { AppState } from "../../../stores/app/appReducer.ts";

vi.mock(import("../../../hooks/useAppDispatch.ts"), () => ({
	default: vi.fn(),
}));
vi.mock(import("../../../stores/settings/settingsActions.ts"));
vi.mock(import("../../../stores/user/userActions.ts"));
vi.mock(import("../../../stores/sync/syncActions.ts"));

describe("appActions", () => {
	let dispatchMock: Mock<Procedure>;

	beforeEach(() => {
		dispatchMock = vi.fn();
		vi.mocked(useAppDispatch).mockReturnValue(dispatchMock);
	});

	it("Should load initial state when not loaded", async () => {
		// Arrange

		const expectedReviewTreeCb = vi.fn();
		const expectedLoadSettingsCb = vi.fn();
		vi.mocked(loadUserState).mockReturnValue(expectedLoadSettingsCb);

		const expectedInitiateSettings = vi.fn();
		vi.mocked(loadAndApplySettings).mockReturnValue(
			expectedInitiateSettings,
		);
		dispatchMock.mockImplementation(cb => {
			if (cb === expectedInitiateSettings) {
				return Promise.resolve({
					autoSync: true,
				} as Partial<UpdateSettingsRequestDto>);
			}
		});

		const expectedSync = vi.fn();
		vi.mocked(sync).mockReturnValue(expectedSync);

		const getState = vi.fn();
		getState.mockReturnValue({
			app: {} as AppState,
		} as RootState);

		// Act

		await initialLoadApplicationState()(dispatchMock, getState);

		// Assert

		expect(dispatchMock).toHaveBeenCalledWith(expectedReviewTreeCb);
		expect(dispatchMock).toHaveBeenCalledWith(expectedLoadSettingsCb);
		expect(dispatchMock).toHaveBeenCalledWith(expectedInitiateSettings);
		expect(dispatchMock).toHaveBeenCalledWith(expectedSync);
	});

	it("Should not load initial state when loaded", async () => {
		// Arrange

		const expectedReviewTreeCb = vi.fn();
		const expectedLoadSettingsCb = vi.fn();
		vi.mocked(loadUserState).mockReturnValue(expectedLoadSettingsCb);

		const expectedInitiateSettings = vi.fn();
		vi.mocked(loadAndApplySettings).mockReturnValue(
			expectedInitiateSettings,
		);
		dispatchMock.mockImplementation(cb => {
			if (cb === expectedInitiateSettings) {
				return Promise.resolve({
					autoSync: true,
				} as Partial<UpdateSettingsRequestDto>);
			}
		});

		const expectedSync = vi.fn();
		vi.mocked(sync).mockReturnValue(expectedSync);

		const getState = vi.fn();
		getState.mockReturnValue({
			app: {
				startedInitialStateLoading: true,
			} as AppState,
		} as RootState);

		// Act

		await initialLoadApplicationState()(dispatchMock, getState);

		// Assert

		expect(dispatchMock).not.toHaveBeenCalledWith(expectedReviewTreeCb);
		expect(dispatchMock).not.toHaveBeenCalledWith(expectedLoadSettingsCb);
		expect(dispatchMock).not.toHaveBeenCalledWith(expectedInitiateSettings);
		expect(dispatchMock).not.toHaveBeenCalledWith(expectedSync);
	});

	it("Should not auto-sync on start if it is not enabled", async () => {
		// Arrange

		const expectedInitiateSettings = vi.fn();
		vi.mocked(loadAndApplySettings).mockReturnValue(
			expectedInitiateSettings,
		);
		dispatchMock.mockImplementation(cb => {
			if (cb === expectedInitiateSettings) {
				return Promise.resolve({
					autoSync: false,
				} as Partial<UpdateSettingsRequestDto>);
			}
		});

		const expectedSync = vi.fn();
		vi.mocked(sync).mockReturnValue(expectedSync);

		const getState = vi.fn();
		getState.mockReturnValue({
			app: {} as AppState,
		} as RootState);

		// Act

		await initialLoadApplicationState()(dispatchMock, getState);

		// Assert

		expect(dispatchMock).toHaveBeenCalledWith(expectedInitiateSettings);
		expect(dispatchMock).not.toHaveBeenCalledWith(expectedSync);
	});
});
