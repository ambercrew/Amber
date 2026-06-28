import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NodeDto } from "../../../../../api/elements/dto/nodeDto";
import ElementTree from "../../../../../features/Sidebar/components/ElementTree/ElementTree";
import { renderWithProviders } from "../../../../test-utils/renderWithProviders";

vi.mock(import("../../../../../stores/elements/elementsActions"));

const TREE: NodeDto[] = [
	{
		meta: {
			id: { type: "folder", id: "folder-science" },
			name: "Science",
			position: "0",
			tags: [],
		},
		children: { folders: [], readings: [], extracts: [], cards: [] },
	},
];

describe("ElementTree delete", () => {
	beforeEach(() => window.localStorage.clear());

	function render() {
		return renderWithProviders(<ElementTree tree={TREE} />);
	}

	it("Should open the delete confirmation modal when Delete is clicked", async () => {
		// Arrange

		const user = userEvent.setup();
		render();

		// Act — right-click Science to open the context menu, then click Delete

		await user.pointer({
			target: screen.getByTitle("Science"),
			keys: "[MouseRight]",
		});
		await waitFor(
			() => expect(screen.getByText("Delete")).toBeInTheDocument(),
			{ timeout: 2000 },
		);
		await user.click(screen.getByText("Delete"));

		// Assert — the confirmation modal is shown

		await waitFor(() => {
			expect(screen.getByText("Delete element")).toBeInTheDocument();
		});
	});
});
