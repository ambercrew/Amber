import { waitFor } from "@testing-library/react";
import { check } from "@tauri-apps/plugin-updater";
import { isStoreInstalled } from "../../../../api/appInfo/api/appInfoApi";
import Updater from "../../../../features/Updater/components/Updater";
import callApiMock from "../../../test-utils/callApiMock";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";

vi.mock(import("@tauri-apps/plugin-updater"));
vi.mock(import("../../../../api/appInfo/api/appInfoApi"));

describe("Updater", () => {
	it("Should do nothing when app is installed from store", async () => {
		// Arrange

		vi.mocked(isStoreInstalled).mockResolvedValue(true);

		// Act

		renderWithProviders(<Updater callApi={callApiMock} />);

		// Assert

		await waitFor(() => {
			expect(vi.mocked(check)).not.toHaveBeenCalled();
		});
	});
});
