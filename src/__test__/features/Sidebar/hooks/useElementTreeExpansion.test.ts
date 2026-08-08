import { act, renderHook } from "@testing-library/react";
import { TreeNodeData } from "@mantine/core";
import { useElementTreeExpansion } from "../../../../features/Sidebar/hooks/useElementTreeExpansion";

// Tree used across tests:
//
//   science-folder
//     └── biology-reading
//           └── cell-card
//   art-folder

function leaf(value: string): TreeNodeData {
	return { value, label: value, children: [] };
}

function node(value: string, children: TreeNodeData[]): TreeNodeData {
	return { value, label: value, children };
}

const DATA: TreeNodeData[] = [
	node("science-folder", [node("biology-reading", [leaf("cell-card")])]),
	leaf("art-folder"),
];

describe("useElementTreeExpansion", () => {
	beforeEach(() => window.localStorage.clear());

	it("Should start with all nodes collapsed", () => {
		// Arrange / Act

		const { result } = renderHook(() => useElementTreeExpansion(DATA));

		// Assert

		expect(result.current.treeController.expandedState).toEqual({});
	});

	it("Should expand ancestors of matching nodes when a search term is entered", () => {
		// Arrange

		const { result } = renderHook(() => useElementTreeExpansion(DATA));

		// Act — search for "cell" which is inside biology-reading inside science-folder

		act(() => result.current.handleSearchChange("cell"));

		// Assert — both ancestor folders must be open to show the match

		expect(
			result.current.treeController.expandedState["science-folder"],
		).toBe(true);
		expect(
			result.current.treeController.expandedState["biology-reading"],
		).toBe(true);
	});

	it("Should return only matching nodes and their ancestors in filteredData when searching", () => {
		// Arrange

		const { result } = renderHook(() => useElementTreeExpansion(DATA));

		// Act

		act(() => result.current.handleSearchChange("cell"));

		// Assert — art-folder does not match and is absent; science-folder is kept as an ancestor

		const values = result.current.filteredData.map(n => n.value);
		expect(values).not.toContain("art-folder");
		expect(values).toContain("science-folder");
	});

	it("Should return the full data in filteredData when search is empty", () => {
		// Arrange

		const { result } = renderHook(() => useElementTreeExpansion(DATA));

		// Act — search then clear

		act(() => result.current.handleSearchChange("cell"));
		act(() => result.current.handleSearchChange(""));

		// Assert

		expect(result.current.filteredData).toBe(DATA);
	});

	it("Should restore pre-search expanded state when search is cleared", () => {
		// Arrange — start with science-folder manually expanded

		const { result } = renderHook(() => useElementTreeExpansion(DATA));
		act(() => result.current.treeController.expand("science-folder"));

		act(() => result.current.handleSearchChange("art"));

		// Sanity: science-folder should be collapsed during the search (art doesn't match it)
		expect(
			result.current.treeController.expandedState["science-folder"],
		).toBeFalsy();

		// Act

		act(() => result.current.handleSearchChange(""));

		// Assert — pre-search state is restored

		expect(
			result.current.treeController.expandedState["science-folder"],
		).toBe(true);
	});

	it("Should expand ancestors of the selected node when search is cleared", () => {
		// Arrange — cell-card is selected; nothing was expanded before searching

		const { result } = renderHook(() =>
			useElementTreeExpansion(DATA, "cell-card"),
		);

		act(() => result.current.handleSearchChange("art"));
		act(() => result.current.handleSearchChange(""));

		// Assert — the path to cell-card must be open: science-folder and biology-reading

		expect(
			result.current.treeController.expandedState["science-folder"],
		).toBe(true);
		expect(
			result.current.treeController.expandedState["biology-reading"],
		).toBe(true);
	});

	it("Should merge pre-search expanded state with selected ancestors on clear", () => {
		// Arrange — art-folder was expanded before searching; biology-reading is selected

		const { result } = renderHook(() =>
			useElementTreeExpansion(DATA, "biology-reading"),
		);
		act(() => result.current.treeController.expand("art-folder"));

		act(() => result.current.handleSearchChange("cell"));
		act(() => result.current.handleSearchChange(""));

		// Assert — both pre-search expansion and selected ancestors are present

		expect(result.current.treeController.expandedState["art-folder"]).toBe(
			true,
		);
		expect(
			result.current.treeController.expandedState["science-folder"],
		).toBe(true);
	});

	it("Should not expand selected ancestors if selectedId is absent", () => {
		// Arrange

		const { result } = renderHook(() => useElementTreeExpansion(DATA));

		act(() => result.current.handleSearchChange("cell"));
		act(() => result.current.handleSearchChange(""));

		// Assert — nothing extra is expanded beyond the empty pre-search state

		expect(result.current.treeController.expandedState).toEqual({});
	});

	it("Should expand ancestors of the selected node on initial render", () => {
		// Arrange / Act — cell-card is selected from the very first render, no search involved

		const { result } = renderHook(() =>
			useElementTreeExpansion(DATA, "cell-card"),
		);

		// Assert — the path to cell-card is opened automatically

		expect(
			result.current.treeController.expandedState["science-folder"],
		).toBe(true);
		expect(
			result.current.treeController.expandedState["biology-reading"],
		).toBe(true);
	});

	it("Should expand ancestors of the newly selected node when navigating without searching", () => {
		// Arrange — nothing selected initially

		const { result, rerender } = renderHook<
			ReturnType<typeof useElementTreeExpansion>,
			{ selectedId: string | null }
		>(({ selectedId }) => useElementTreeExpansion(DATA, selectedId), {
			initialProps: { selectedId: null },
		});

		expect(result.current.treeController.expandedState).toEqual({});

		// Act — simulate navigating to cell-card

		rerender({ selectedId: "cell-card" });

		// Assert — the path to cell-card is revealed

		expect(
			result.current.treeController.expandedState["science-folder"],
		).toBe(true);
		expect(
			result.current.treeController.expandedState["biology-reading"],
		).toBe(true);
	});

	it("Should not expand anything when the selected node has no ancestors", () => {
		// Arrange / Act — art-folder is a top-level node with no parents

		const { result } = renderHook(() =>
			useElementTreeExpansion(DATA, "art-folder"),
		);

		// Assert

		expect(result.current.treeController.expandedState).toEqual({});
	});
});
