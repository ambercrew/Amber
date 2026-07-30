import { render } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import SafeAreaTopBackdrop from "../../../components/SafeAreaTopBackdrop/SafeAreaTopBackdrop";
import { isMobile } from "../../../utils/tauriUtils";

vi.mock(import("../../../utils/tauriUtils"));

function renderBackdrop() {
	return render(
		<MantineProvider>
			<SafeAreaTopBackdrop />
		</MantineProvider>,
	);
}

describe("SafeAreaTopBackdrop", () => {
	it("Should render a fixed, opaque strip when on mobile", () => {
		// Arrange

		vi.mocked(isMobile).mockReturnValue(true);

		// Act

		const { container } = renderBackdrop();

		// Assert

		const backdrop = container.querySelector("div");
		expect(backdrop).toBeInTheDocument();
		expect(backdrop).toHaveStyle({ position: "fixed", top: "0px" });
	});

	it("Should render nothing when not on mobile", () => {
		// Arrange

		vi.mocked(isMobile).mockReturnValue(false);

		// Act

		const { container } = renderBackdrop();

		// Assert

		expect(container.querySelector("div")).not.toBeInTheDocument();
	});
});
