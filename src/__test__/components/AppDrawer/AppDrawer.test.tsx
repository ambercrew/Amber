import { screen } from "@testing-library/react";
import AppDrawer from "../../../components/AppDrawer/AppDrawer";
import useBackButtonPress from "../../../hooks/useBackButtonPress";
import { BackButtonPriority } from "../../../managers/backButtonManager";
import { renderWithProviders } from "../../test-utils/renderWithProviders";

vi.mock(import("../../../hooks/useBackButtonPress"));

interface RenderDrawerProps {
	opened?: boolean;
	closeOnEscape?: boolean;
	onClose?: () => void;
}

function renderDrawer({
	opened = true,
	onClose = vi.fn(),
	...props
}: RenderDrawerProps = {}) {
	renderWithProviders(
		<AppDrawer opened={opened} onClose={onClose} title="Title" {...props}>
			Body
		</AppDrawer>,
	);
}

/** Whether the back button is wired up, per the last render. */
function backButtonEnabled(): boolean {
	const calls = vi.mocked(useBackButtonPress).mock.calls;
	return calls[calls.length - 1][1] === true;
}

describe("AppDrawer", () => {
	it("Should close on the back button when open", () => {
		// Arrange

		const onClose = vi.fn();
		renderDrawer({ onClose });

		// Act

		vi.mocked(useBackButtonPress).mock.calls[0][0]();

		// Assert

		expect(backButtonEnabled()).toBe(true);
		expect(onClose).toHaveBeenCalled();
	});

	it("Should outrank modals for the back button so it closes first", () => {
		// Arrange, Act

		renderDrawer();

		// Assert

		expect(vi.mocked(useBackButtonPress).mock.calls[0][2]).toBe(
			BackButtonPriority.High,
		);
	});

	it("Should ignore the back button when the drawer is closed", () => {
		// Arrange, Act

		renderDrawer({ opened: false });

		// Assert

		expect(backButtonEnabled()).toBe(false);
	});

	it("Should ignore the back button when the drawer refuses escape", () => {
		// Arrange, Act

		renderDrawer({ closeOnEscape: false });

		// Assert

		expect(backButtonEnabled()).toBe(false);
	});

	it("Should label the close button when none is given", () => {
		// Arrange, Act

		renderDrawer();

		// Assert

		expect(screen.getByLabelText("Close")).toBeInTheDocument();
	});
});
