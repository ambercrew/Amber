import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import AppModal from "../../../components/AppModal/AppModal";
import { useIsSmallScreen } from "../../../hooks/useIsSmallScreen";
import { isMobile } from "../../../utils/tauriUtils";

vi.mock(import("../../../hooks/useIsSmallScreen"));
vi.mock(import("../../../utils/tauriUtils"));

// jsdom's CSS parser drops `env(...)` declarations, so the safe area padding
// itself is covered by the safeAreaTopStyle tests rather than through the DOM.
function renderModal(props: { fullScreen?: boolean } = {}) {
	render(
		<MantineProvider>
			<AppModal opened onClose={vi.fn()} title="Title" {...props}>
				Body
			</AppModal>
		</MantineProvider>,
	);
	return document.querySelector<HTMLElement>(".mantine-Modal-content")!;
}

describe("AppModal", () => {
	beforeEach(() => {
		vi.mocked(useIsSmallScreen).mockReturnValue(true);
		vi.mocked(isMobile).mockReturnValue(true);
	});

	it("Should go full screen when the screen is small", () => {
		// Arrange, Act

		const actual = renderModal();

		// Assert

		expect(actual).toHaveAttribute("data-full-screen");
	});

	it("Should stay a dialog when the screen is not small", () => {
		// Arrange

		vi.mocked(useIsSmallScreen).mockReturnValue(false);

		// Act

		const actual = renderModal();

		// Assert

		expect(actual).not.toHaveAttribute("data-full-screen");
	});

	it("Should keep an explicit full screen choice when one is given", () => {
		// Arrange, Act

		const actual = renderModal({ fullScreen: false });

		// Assert

		expect(actual).not.toHaveAttribute("data-full-screen");
	});

	it("Should label the close button when none is given", () => {
		// Arrange, Act

		renderModal();

		// Assert

		expect(screen.getByLabelText("Close")).toBeInTheDocument();
	});
});
