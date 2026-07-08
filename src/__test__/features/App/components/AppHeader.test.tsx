import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppHeader from "../../../../features/App/components/AppHeader";
import CommandPalette from "../../../../commands/CommandPalette";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { AnyElementDto } from "../../../../api/elements/dto/anyElementDto";
import { getDueElements } from "../../../../api/study/api/studyApi";

vi.mock(import("../../../../api/study/api/studyApi.ts"));

vi.mocked(getDueElements).mockResolvedValue([]);

const folderElement: AnyElementDto = {
	type: "folder",
	data: {
		meta: {
			elementId: { type: "folder", id: "folder-science" },
			name: "Science",
			position: "0",
			parent: null,
			tags: [],
			createdAt: "2024-01-01T00:00:00Z",
			modifiedAt: "2024-01-01T00:00:00Z",
		},
	},
};

const BASE_STATE = {
	elements: { tree: [], isLoading: false, error: null, currentElement: null },
};

describe("AppHeader", () => {
	it("Should show no element name when no element is selected", () => {
		// Arrange & Act

		renderWithProviders(<AppHeader pinned onToggleSidebar={vi.fn()} />, {
			preloadedState: BASE_STATE,
		});

		// Assert

		expect(screen.getAllByRole("button")).toHaveLength(2);
		expect(screen.getByRole("switch")).toBeInTheDocument();
	});

	it("Should show element name when an element is selected", () => {
		// Arrange & Act

		renderWithProviders(<AppHeader pinned onToggleSidebar={vi.fn()} />, {
			preloadedState: {
				elements: {
					...BASE_STATE.elements,
					currentElement: folderElement,
				},
			},
		});

		// Assert

		expect(screen.getByText("Science")).toBeInTheDocument();
	});

	it("Should call onToggleSidebar when sidebar button is clicked", async () => {
		// Arrange

		const onToggleSidebar = vi.fn();
		const user = userEvent.setup();

		// Act

		renderWithProviders(
			<AppHeader pinned onToggleSidebar={onToggleSidebar} />,
			{
				preloadedState: BASE_STATE,
			},
		);
		await user.click(screen.getByTitle("Toggle sidebar"));

		// Assert

		expect(onToggleSidebar).toHaveBeenCalledOnce();
	});

	it("Should open the command palette when the command button is clicked", async () => {
		// Arrange

		const user = userEvent.setup();

		// Act

		renderWithProviders(
			<>
				<AppHeader pinned onToggleSidebar={vi.fn()} />
				<CommandPalette />
			</>,
			{ preloadedState: BASE_STATE },
		);
		await user.click(screen.getByTitle("Open command palette (Ctrl + K)"));

		// Assert

		expect(
			await screen.findByPlaceholderText("Search commands..."),
		).toBeInTheDocument();
	});
});
