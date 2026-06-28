import { screen, waitFor } from "@testing-library/react";
import { useRedirectIfElementMissing } from "../../hooks/useRedirectIfElementMissing";
import { useElementParams } from "../../hooks/useElementParams";
import {
	LOCATION_DISPLAY_TEST_ID,
	renderWithProviders,
} from "../test-utils/renderWithProviders";
import { NodeDto } from "../../api/elements/dto/nodeDto";
import { elementExists } from "../../api/elements/api/elementsApi.ts";

vi.mock(import("../../hooks/useElementParams"));
vi.mock(import("../../api/elements/api/elementsApi.ts"));

const TREE: NodeDto[] = [
	{
		meta: { id: "folder-1", name: "Science", position: "0", tags: [] },
		children: { folders: [], readings: [], extracts: [], cards: [] },
	},
];

const PRELOADED_STATE = {
	elements: { tree: TREE, isLoading: false, error: null },
};

function HookWrapper() {
	useRedirectIfElementMissing();
	return null;
}

function render(initialEntries = ["/folder/folder-1"]) {
	return renderWithProviders(<HookWrapper />, {
		preloadedState: PRELOADED_STATE,
		memoryRouterProps: { initialEntries },
	});
}

describe("useRedirectIfElementMissing", () => {
	it("Should not navigate when no element is selected", () => {
		// Arrange

		vi.mocked(useElementParams).mockReturnValue(null);

		// Act

		render();

		// Assert

		expect(screen.getByTestId(LOCATION_DISPLAY_TEST_ID)).toHaveTextContent(
			"/folder/folder-1",
		);
	});

	it("Should not navigate when the element exists in the tree", () => {
		// Arrange

		vi.mocked(elementExists).mockResolvedValue(true);
		vi.mocked(useElementParams).mockReturnValue({
			type: "folder",
			id: "folder-1",
		});

		// Act

		render();

		// Assert

		expect(screen.getByTestId(LOCATION_DISPLAY_TEST_ID)).toHaveTextContent(
			"/folder/folder-1",
		);
	});

	it("Should navigate back when the element is not in the tree", async () => {
		// Arrange

		vi.mocked(elementExists).mockResolvedValue(false);
		vi.mocked(useElementParams).mockReturnValue({
			type: "folder",
			id: "folder-missing",
		});

		// Act

		render(["/", "/folder/folder-missing"]);

		// Assert

		await waitFor(() => {
			expect(
				screen.getByTestId(LOCATION_DISPLAY_TEST_ID),
			).toHaveTextContent("/");
		});
	});
});
