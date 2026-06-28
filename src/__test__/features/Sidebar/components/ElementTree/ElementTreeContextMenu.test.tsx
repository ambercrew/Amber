import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NodeDto } from "../../../../../api/elements/dto/nodeDto";
import ElementTree from "../../../../../features/Sidebar/components/ElementTree/ElementTree";
import { renderWithProviders } from "../../../../test-utils/renderWithProviders";

vi.mock(import("../../../../../stores/elements/elementsActions"));

const TREE: NodeDto[] = [
	{
		meta: {
			id: "folder-science",
			name: "Science",
			position: "0",
			tags: [],
		},
		children: { folders: [], readings: [], extracts: [], cards: [] },
	},
];

describe("ElementTree context menu", () => {
	beforeEach(() => window.localStorage.clear());

	function render() {
		return renderWithProviders(<ElementTree tree={TREE} />);
	}

	it("Should show menu items when a node is right-clicked", async () => {
		// Arrange

		const user = userEvent.setup();
		render();

		// Act

		await user.pointer({
			target: screen.getByTitle("Science"),
			keys: "[MouseRight]",
		});

		// Assert

		await waitFor(
			() => expect(screen.getByText("Delete")).toBeInTheDocument(),
			{ timeout: 2000 },
		);
	});

	it("Should show menu items when the three-dots button is clicked", async () => {
		// Arrange

		const user = userEvent.setup();
		render();

		// Act

		await user.hover(screen.getByTitle("Science"));
		await user.click(
			screen.getByRole("button", { name: "Open actions menu" }),
		);

		// Assert

		await waitFor(
			() => expect(screen.getByText("Delete")).toBeInTheDocument(),
			{ timeout: 2000 },
		);
	});

	it("Should show only one context menu when right-clicked multiple times", async () => {
		// Arrange

		const user = userEvent.setup();
		render();

		// Act — right-click Science twice in a row

		await user.pointer({
			target: screen.getByTitle("Science"),
			keys: "[MouseRight]",
		});
		await waitFor(
			() => expect(screen.getByText("Delete")).toBeInTheDocument(),
			{ timeout: 2000 },
		);
		await user.pointer({
			target: screen.getByTitle("Science"),
			keys: "[MouseRight]",
		});

		// Assert — still only one Delete item in the DOM

		await waitFor(() => {
			expect(screen.getAllByText("Delete")).toHaveLength(1);
		});
	});
});
