import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import AppDrawer from "../../../components/AppDrawer/AppDrawer";
import useBackButtonPress from "../../../hooks/useBackButtonPress";

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
	render(
		<MantineProvider>
			<AppDrawer
				opened={opened}
				onClose={onClose}
				title="Title"
				{...props}>
				Body
			</AppDrawer>
		</MantineProvider>,
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
