import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FolderNodeDto from "../../../../../api/elements/dto/folderNodeDto";
import ElementTree from "../../../../../features/Sidebar/components/ElementTree/ElementTree";
import { renameElementAction } from "../../../../../stores/elements/elementsActions";
import { renderWithProviders } from "../../../../test-utils/renderWithProviders";

vi.mock(import("../../../../../stores/elements/elementsActions"));
vi.mock(
	import("../../../../../features/Sidebar/components/ElementTree/ElementTreeMenuItems"),
	() => ({ default: () => <></> }),
);
vi.mock(
	import("../../../../../features/Sidebar/components/DeleteElementModal"),
	() => ({ default: () => <></> }),
);

const TREE: FolderNodeDto[] = [
	{
		id: "folder-science",
		name: "Science",
		position: 0,
		tags: [],
		folders: [],
		readings: [],
		extracts: [],
		cards: [],
	},
];

describe("ElementTree rename", () => {
	beforeEach(() => window.localStorage.clear());

	function render() {
		return renderWithProviders(<ElementTree tree={TREE} />);
	}

	it("Should focus the rename input when a node is double-clicked", async () => {
		// Arrange

		const user = userEvent.setup();
		render();

		// Act

		await user.dblClick(screen.getByTitle("Science"));

		// Assert

		await waitFor(() => {
			expect(
				screen.getByRole("textbox", { name: "Rename element" }),
			).toHaveFocus();
		});
	});

	it("Should dispatch renameElementAction with the new name when submitted", async () => {
		// Arrange

		const mockThunk = vi.fn().mockResolvedValue(undefined);
		vi.mocked(renameElementAction).mockReturnValue(mockThunk);

		const user = userEvent.setup();
		render();

		await user.dblClick(screen.getByTitle("Science"));
		const input = await screen.findByRole("textbox", {
			name: "Rename element",
		});

		// Act

		await user.clear(input);
		await user.type(input, "Renamed Science");
		await user.keyboard("{Enter}");

		// Assert

		expect(renameElementAction).toHaveBeenCalledWith(
			{ type: "folder", id: "folder-science" },
			"Renamed Science",
		);
	});
});
