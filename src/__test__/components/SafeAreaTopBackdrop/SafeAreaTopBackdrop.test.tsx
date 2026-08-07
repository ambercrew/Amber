import SafeAreaTopBackdrop from "../../../components/SafeAreaTopBackdrop/SafeAreaTopBackdrop";
import { isMobile } from "../../../utils/tauriUtils";
import { renderWithProviders } from "../../test-utils/renderWithProviders";

vi.mock(import("../../../utils/tauriUtils"));

function renderBackdrop() {
	return renderWithProviders(<SafeAreaTopBackdrop />);
}

function getBackdrop(container: HTMLElement) {
	return container.querySelector<HTMLElement>("div:not([data-testid])");
}

describe("SafeAreaTopBackdrop", () => {
	it("Should render a fixed, opaque strip when on mobile", () => {
		// Arrange

		vi.mocked(isMobile).mockReturnValue(true);

		// Act

		const { container } = renderBackdrop();

		// Assert

		const backdrop = getBackdrop(container);
		expect(backdrop).toBeInTheDocument();
		expect(backdrop).toHaveStyle({ position: "fixed", top: "0px" });
	});

	it("Should render nothing when not on mobile", () => {
		// Arrange

		vi.mocked(isMobile).mockReturnValue(false);

		// Act

		const { container } = renderBackdrop();

		// Assert

		expect(getBackdrop(container)).not.toBeInTheDocument();
	});
});
