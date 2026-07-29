import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NodeDto } from "../../../../../api/elements/dto/nodeDto";
import ElementTree from "../../../../../features/Sidebar/components/ElementTree/ElementTree";
import { isMobile } from "../../../../../utils/tauriUtils";
import {
	LOCATION_DISPLAY_TEST_ID,
	renderWithProviders,
} from "../../../../test-utils/renderWithProviders";

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

describe("ElementTreeNode actions menu navigation", () => {
	beforeEach(() => {
		window.localStorage.clear();
		// The menu button is only reachable without hover on mobile.
		vi.mocked(isMobile).mockReturnValue(true);
	});

	it("Should not select the element when its actions menu is used", async () => {
		// Arrange

		const user = userEvent.setup();
		renderWithProviders(<ElementTree tree={TREE} />);
		await user.click(screen.getByLabelText("Open actions menu"));
		await waitFor(() =>
			expect(screen.getByText("New")).toBeInTheDocument(),
		);

		// Act — open the "New" submenu

		await user.click(screen.getByText("New"));

		// Assert — the route is untouched, so the sidebar stays open

		expect(screen.getByTestId(LOCATION_DISPLAY_TEST_ID)).toHaveTextContent(
			"/",
		);
		expect(
			screen.getByTestId(LOCATION_DISPLAY_TEST_ID),
		).not.toHaveTextContent("folder-science");
	});
});
