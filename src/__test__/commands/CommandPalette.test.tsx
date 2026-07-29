import { act } from "@testing-library/react";
import { spotlight } from "@mantine/spotlight";
import CommandPalette from "../../commands/CommandPalette";
import useBackButtonPress from "../../hooks/useBackButtonPress";
import { renderWithProviders } from "../test-utils/renderWithProviders";

vi.mock(import("../../hooks/useBackButtonPress"));

/** Whether the back button is wired up, per the last render. */
function backButtonEnabled(): boolean {
	const calls = vi.mocked(useBackButtonPress).mock.calls;
	return calls[calls.length - 1][1] === true;
}

describe("CommandPalette", () => {
	afterEach(() => {
		act(() => spotlight.close());
	});

	it("Should ignore the back button when the palette is closed", () => {
		// Arrange, Act

		renderWithProviders(<CommandPalette />);

		// Assert

		expect(backButtonEnabled()).toBe(false);
	});

	it("Should close the palette on the back button when it is open", () => {
		// Arrange

		renderWithProviders(<CommandPalette />);

		// Act

		act(() => spotlight.open());

		// Assert

		expect(backButtonEnabled()).toBe(true);
		expect(vi.mocked(useBackButtonPress).mock.calls[0][0]).toBe(
			spotlight.close,
		);
	});
});
