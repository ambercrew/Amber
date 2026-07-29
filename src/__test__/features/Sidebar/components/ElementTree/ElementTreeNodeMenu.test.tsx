import { screen } from "@testing-library/react";
import { NodeDto } from "../../../../../api/elements/dto/nodeDto";
import ElementTree from "../../../../../features/Sidebar/components/ElementTree/ElementTree";
import { isMobile } from "../../../../../utils/tauriUtils";
import { renderWithProviders } from "../../../../test-utils/renderWithProviders";

vi.mock(import("../../../../../utils/tauriUtils"));

const TREE: NodeDto[] = [
	{
		meta: {
			elementId: { type: "folder", id: "folder-science" },
			name: "Science",
			position: "0",
		},
		children: { folders: [], readings: [], extracts: [], cards: [] },
	},
];

describe("ElementTreeNode actions menu", () => {
	beforeEach(() => window.localStorage.clear());

	function renderMenuButton() {
		renderWithProviders(<ElementTree tree={TREE} />);
		return screen.getByLabelText("Open actions menu");
	}

	it("Should show the actions menu when running on mobile", () => {
		// Arrange

		vi.mocked(isMobile).mockReturnValue(true);

		// Act

		const actual = renderMenuButton();

		// Assert

		expect(actual.style.visibility).toBe("visible");
	});

	it("Should hide the actions menu until hovered when running on desktop", () => {
		// Arrange

		vi.mocked(isMobile).mockReturnValue(false);

		// Act

		const actual = renderMenuButton();

		// Assert

		expect(actual.style.visibility).toBe("hidden");
	});
});
