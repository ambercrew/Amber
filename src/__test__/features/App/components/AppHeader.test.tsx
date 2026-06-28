import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppHeader from "../../../../features/App/components/AppHeader";
import { useElementParams } from "../../../../hooks/useElementParams";
import {
	LOCATION_DISPLAY_TEST_ID,
	renderWithProviders,
} from "../../../test-utils/renderWithProviders";
import { NodeDto } from "../../../../api/elements/dto/nodeDto";

vi.mock(import("../../../../hooks/useElementParams"));

const TREE: NodeDto[] = [
	{
		meta: {
			id: { type: "folder", id: "folder-science" },
			name: "Science",
			position: "0",
			tags: [],
		},
		children: {
			folders: [],
			readings: [
				{
					meta: {
						id: { type: "reading", id: "reading-biology" },
						name: "Biology Basics",
						position: "0",
						tags: [],
					},
					children: {
						folders: [],
						readings: [],
						extracts: [],
						cards: [],
					},
				},
			],
			extracts: [],
			cards: [],
		},
	},
];

const PRELOADED_STATE = {
	elements: { tree: TREE, isLoading: false, error: null },
};

describe("AppHeader breadcrumbs", () => {
	it("Should show no breadcrumbs when no element is selected", () => {
		// Arrange

		vi.mocked(useElementParams).mockReturnValue(null);

		// Act

		renderWithProviders(<AppHeader onToggleSidebar={vi.fn()} />, {
			preloadedState: PRELOADED_STATE,
		});

		// Assert

		expect(screen.queryByRole("link")).toBeNull();
	});

	it("Should show the element name in the breadcrumbs when it is selected", () => {
		// Arrange

		vi.mocked(useElementParams).mockReturnValue({
			type: "folder",
			id: "folder-science",
		});

		// Act

		renderWithProviders(<AppHeader onToggleSidebar={vi.fn()} />, {
			preloadedState: PRELOADED_STATE,
		});

		// Assert

		expect(screen.getByText("Science")).toBeInTheDocument();
	});

	it("Should show the full ancestor path when a nested element is selected", () => {
		// Arrange

		vi.mocked(useElementParams).mockReturnValue({
			type: "reading",
			id: "reading-biology",
		});

		// Act

		renderWithProviders(<AppHeader onToggleSidebar={vi.fn()} />, {
			preloadedState: PRELOADED_STATE,
		});

		// Assert

		expect(screen.getByText("Science")).toBeInTheDocument();
		expect(screen.getByText("Biology Basics")).toBeInTheDocument();
	});

	it("Should navigate to the element when a breadcrumb item is clicked", async () => {
		// Arrange

		vi.mocked(useElementParams).mockReturnValue({
			type: "reading",
			id: "reading-biology",
		});

		const user = userEvent.setup();
		renderWithProviders(<AppHeader onToggleSidebar={vi.fn()} />, {
			preloadedState: PRELOADED_STATE,
		});

		// Act

		await user.click(screen.getByText("Science"));

		// Assert

		expect(screen.getByTestId(LOCATION_DISPLAY_TEST_ID)).toHaveTextContent(
			"/folder/folder-science",
		);
	});
});
