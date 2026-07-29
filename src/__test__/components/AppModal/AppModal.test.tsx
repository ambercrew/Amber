import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import AppModal from "../../../components/AppModal/AppModal";
import useBackButtonPress from "../../../hooks/useBackButtonPress";
import { useIsSmallScreen } from "../../../hooks/useIsSmallScreen";
import { isMobile } from "../../../utils/tauriUtils";

vi.mock(import("../../../hooks/useIsSmallScreen"));
vi.mock(import("../../../hooks/useBackButtonPress"));
vi.mock(import("../../../utils/tauriUtils"));

interface RenderModalProps {
	fullScreen?: boolean;
	opened?: boolean;
	closeOnEscape?: boolean;
	closeOnBackButton?: boolean;
	onClose?: () => void;
}

// jsdom's CSS parser drops `env(...)` declarations, so the safe area padding
// itself is covered by the safeAreaTopStyle tests rather than through the DOM.
function renderModal({
	opened = true,
	onClose = vi.fn(),
	...props
}: RenderModalProps = {}) {
	render(
		<MantineProvider>
			<AppModal
				opened={opened}
				onClose={onClose}
				title="Title"
				{...props}>
				Body
			</AppModal>
		</MantineProvider>,
	);
	return document.querySelector<HTMLElement>(".mantine-Modal-content")!;
}

/** Whether the back button is wired up, per the last render. */
function backButtonEnabled(): boolean {
	const calls = vi.mocked(useBackButtonPress).mock.calls;
	return calls[calls.length - 1][1] === true;
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

	it("Should close on the back button when open", () => {
		// Arrange

		const onClose = vi.fn();
		renderModal({ onClose });

		// Act

		vi.mocked(useBackButtonPress).mock.calls[0][0]();

		// Assert

		expect(backButtonEnabled()).toBe(true);
		expect(onClose).toHaveBeenCalled();
	});

	it("Should take the back button even when the modal is not full screen", () => {
		// Arrange, Act

		renderModal({ fullScreen: false });

		// Assert

		expect(backButtonEnabled()).toBe(true);
	});

	it("Should ignore the back button when the modal is closed", () => {
		// Arrange, Act

		renderModal({ opened: false });

		// Assert

		expect(backButtonEnabled()).toBe(false);
	});

	it("Should ignore the back button when the modal refuses escape", () => {
		// Arrange, Act

		renderModal({ closeOnEscape: false });

		// Assert

		expect(backButtonEnabled()).toBe(false);
	});

	it("Should leave the back button alone when something layered on top takes it", () => {
		// Arrange, Act

		renderModal({ closeOnBackButton: false });

		// Assert

		expect(backButtonEnabled()).toBe(false);
	});

	it("Should label the close button when none is given", () => {
		// Arrange, Act

		renderModal();

		// Assert

		expect(screen.getByLabelText("Close")).toBeInTheDocument();
	});
});
