import { screen } from "@testing-library/react";
import { vi } from "vitest";
import SettingsModal from "../../../../features/Settings/components/SettingsModal";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import UpdateSettingsRequestDto from "../../../../api/settings/dto/updateSettingsRequestDto";

// AppearanceTab reads the OS type (Tauri plugin) to hide zoom on mobile;
// stub it so the component renders in jsdom.
vi.mock("../../../../utils/tauriUtils", () => ({
	isMobile: () => false,
}));

const settings: UpdateSettingsRequestDto = {
	baseDatabaseDirectory: "/home/user/brainy",
	theme: "Light",
	zoomPercentage: 100,
	autoSync: true,
	enableAi: false,
	aiProvider: "ollama",
	ollama: { modelName: null, embeddingsModelName: null },
	openai: { modelName: null, embeddingsModelName: null },
	openaiApiKeyIsSet: false,
};

function renderModal(opened: boolean) {
	return renderWithProviders(<SettingsModal />, {
		preloadedState: {
			app: {
				startedInitialStateLoading: false,
				importModalOpened: false,
				studyProfileModalOpened: false,
				settingsModalOpened: opened,
			},
			settings: { settings },
		},
	});
}

describe("SettingsModal", () => {
	it("Should not render settings content when the modal is closed", () => {
		// Arrange

		// Act

		renderModal(false);

		// Assert

		expect(screen.queryByText("Appearance")).not.toBeInTheDocument();
	});

	it("Should render the appearance controls when the modal is opened", () => {
		// Arrange

		// Act

		renderModal(true);

		// Assert

		expect(screen.getByText("Appearance")).toBeInTheDocument();
		expect(screen.getByText("Follow system")).toBeInTheDocument();
	});
});
