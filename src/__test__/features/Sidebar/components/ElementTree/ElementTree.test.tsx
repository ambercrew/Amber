import { MantineProvider } from "@mantine/core";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NodeDto } from "../../../../../api/elements/dto/nodeDto";
import ElementTree from "../../../../../features/Sidebar/components/ElementTree/ElementTree";
import { ElementId } from "../../../../../types/elements/elementId";
import {
	LOCATION_DISPLAY_TEST_ID,
	renderWithProviders,
} from "../../../../test-utils/renderWithProviders";

vi.mock(
	import("../../../../../features/Sidebar/components/ElementTree/ElementTreeMenuItems"),
	() => ({ default: () => <></> }),
);
vi.mock(
	import("../../../../../features/Sidebar/components/DeleteElementModal"),
	() => ({ default: () => <></> }),
);
vi.mock(
	import("../../../../../features/Sidebar/components/ElementTree/RenameElementForm"),
	() => ({ default: () => <></> }),
);

function makeNode(
	id: ElementId,
	name: string,
	children: Partial<NodeDto["children"]> = {},
	position = "0",
): NodeDto {
	return {
		meta: { elementId: id, name, position },
		children: {
			folders: [],
			readings: [],
			extracts: [],
			cards: [],
			...children,
		},
	};
}

const TREE: NodeDto[] = [
	makeNode({ type: "folder", id: "folder-science" }, "Science", {
		readings: [
			makeNode(
				{ type: "reading", id: "reading-biology" },
				"Biology Basics",
			),
		],
	}),
	makeNode({ type: "folder", id: "folder-art" }, "Art", {
		extracts: [
			makeNode(
				{ type: "extract", id: "extract-impressionism" },
				"Impressionism",
				{
					cards: [
						makeNode({ type: "card", id: "card-1" }, "Monet"),
						makeNode({ type: "card", id: "card-2" }, "Renoir"),
					],
				},
			),
		],
	}),
];

describe("ElementTree search", () => {
	beforeEach(() => window.localStorage.clear());

	function render() {
		return renderWithProviders(
			<MantineProvider>
				<ElementTree tree={TREE} />
			</MantineProvider>,
		);
	}

	it("Should show all root nodes when no search is active", () => {
		// Arrange

		// Act

		render();

		// Assert

		expect(screen.getByTitle("Science")).toBeInTheDocument();
		expect(screen.getByTitle("Art")).toBeInTheDocument();
	});

	it("Should highlight matching text when search term is typed", async () => {
		// Arrange

		const user = userEvent.setup();
		render();

		// Act

		await user.type(screen.getByPlaceholderText("Search..."), "Science");

		// Assert

		expect(document.querySelector("mark")).toHaveTextContent("Science");
	});

	it("Should not highlight non-matching nodes", async () => {
		// Arrange

		const user = userEvent.setup();
		render();

		// Act

		await user.type(screen.getByPlaceholderText("Search..."), "Science");

		// Assert

		const marks = document.querySelectorAll("mark");
		const markTexts = Array.from(marks).map(m => m.textContent);
		expect(markTexts.every(t => t === "Science")).toBe(true);
	});

	it("Should remove irrelevant nodes from the DOM when searching", async () => {
		// Arrange

		const user = userEvent.setup();
		render();

		// Assert pre-condition — both root nodes visible before searching
		expect(screen.getByTitle("Science")).toBeInTheDocument();
		expect(screen.getByTitle("Art")).toBeInTheDocument();

		// Act

		await user.type(screen.getByPlaceholderText("Search..."), "Science");

		// Assert — Art does not match and must not be in the DOM at all

		expect(screen.queryByTitle("Art")).not.toBeInTheDocument();
		expect(screen.getByTitle("Science")).toBeInTheDocument();
	});

	it("Should restore pre-search expanded state when search is cleared", async () => {
		// Arrange

		const user = userEvent.setup();
		render();

		// Verifying that the element is hidden before anything is done.
		expect(screen.queryByTitle("Biology Basics")).toBeNull();

		const input = screen.getByPlaceholderText("Search...");

		// Expand Science before searching via its accessible expand button.
		await user.click(screen.getAllByRole("button", { name: "Expand" })[0]);

		expect(screen.getByTitle("Biology Basics")).toBeInTheDocument();

		// Act — search for something that matches neither Science nor Biology Basics,
		// collapsing the Science folder during the search.
		await user.type(input, "Art");

		expect(screen.queryByTitle("Biology Basics")).not.toBeInTheDocument();

		await user.clear(input);

		// Assert — pre-search expanded state restored: Science still expanded.
		expect(screen.getByTitle("Biology Basics")).toBeInTheDocument();
	});

	it("Should remove highlight when search is cleared", async () => {
		// Arrange

		const user = userEvent.setup();
		render();
		const input = screen.getByPlaceholderText("Search...");
		await user.type(input, "Science");

		// Act

		await user.clear(input);

		// Assert

		expect(document.querySelector("mark")).toBeNull();
	});

	it("Should navigate to the element when its name is clicked", async () => {
		// Arrange

		const user = userEvent.setup();
		render();

		// Act

		await user.click(screen.getByTitle("Science"));

		// Assert

		expect(screen.getByTestId(LOCATION_DISPLAY_TEST_ID)).toHaveTextContent(
			"/folder/folder-science",
		);
	});

	it("Should remember expanded state after unmount and remount", async () => {
		// Arrange

		const user = userEvent.setup();
		const { unmount } = render();

		await user.click(screen.getAllByRole("button", { name: "Expand" })[0]);
		expect(screen.getByTitle("Biology Basics")).toBeInTheDocument();

		// Act

		unmount();
		render();

		// Assert — localStorage restores the expanded state on remount.
		await waitFor(() => {
			expect(screen.getByTitle("Biology Basics")).toBeInTheDocument();
		});
	});

	it("Should show correct child count on a folder label", () => {
		// Arrange

		// Act

		render();

		// Assert — Science has 1 reading child.
		expect(screen.getByText("Science (1)")).toBeInTheDocument();
	});

	it("Should show correct child count on an extract label", async () => {
		// Arrange

		const user = userEvent.setup();
		render();

		// Expand Art to reveal its child extract.
		await user.click(screen.getAllByRole("button", { name: "Expand" })[1]);

		// Assert — Impressionism has 2 card children.
		expect(screen.getByText("Impressionism (2)")).toBeInTheDocument();
	});
});

describe("ElementTree sorting", () => {
	beforeEach(() => window.localStorage.clear());

	it("Should sort mixed-type children by position", async () => {
		// Arrange — a folder whose children span all four types, with
		// positions deliberately out of insertion order so the sort is
		// observable.

		const tree: NodeDto[] = [
			{
				meta: {
					elementId: { type: "folder", id: "root" },
					name: "Root",
					position: "0",
				},
				children: {
					folders: [
						makeNode(
							{ type: "folder", id: "child-folder" },
							"Child Folder",
							{},
							"c",
						),
					],
					readings: [
						makeNode(
							{ type: "reading", id: "child-reading" },
							"Child Reading",
							{},
							"a",
						),
					],
					extracts: [
						makeNode(
							{ type: "extract", id: "child-extract" },
							"Child Extract",
							{},
							"d",
						),
					],
					cards: [
						makeNode(
							{ type: "card", id: "child-card" },
							"Child Card",
							{},
							"b",
						),
					],
				},
			},
		];
		const user = userEvent.setup();
		renderWithProviders(
			<MantineProvider>
				<ElementTree tree={tree} />
			</MantineProvider>,
		);

		// Act — expand Root to reveal all children.

		await user.click(screen.getByRole("button", { name: "Expand" }));

		// Assert — children appear in position order: Reading(a) < Card(b) < Folder(c) < Extract(d)

		const items = screen
			.getAllByRole("treeitem")
			.map(li => li.querySelector("[title]")?.getAttribute("title"))
			.filter(Boolean);

		const childIndex = (name: string) => items.indexOf(name);
		expect(childIndex("Child Reading")).toBeLessThan(
			childIndex("Child Card"),
		);
		expect(childIndex("Child Card")).toBeLessThan(
			childIndex("Child Folder"),
		);
		expect(childIndex("Child Folder")).toBeLessThan(
			childIndex("Child Extract"),
		);
	});

	it("Should sort root-level nodes by position regardless of type", () => {
		// Arrange — two folders and a reading at root, with positions that
		// put the reading between the two folders.

		const tree: NodeDto[] = [
			makeNode(
				{ type: "folder", id: "folder-first" },
				"First Folder",
				{},
				"a",
			),
			makeNode(
				{ type: "reading", id: "reading-middle" },
				"Middle Reading",
				{},
				"b",
			),
			makeNode(
				{ type: "folder", id: "folder-last" },
				"Last Folder",
				{},
				"c",
			),
		];
		renderWithProviders(
			<MantineProvider>
				<ElementTree tree={tree} />
			</MantineProvider>,
		);

		// Assert

		const items = screen
			.getAllByRole("treeitem")
			.map(li => li.querySelector("[title]")?.getAttribute("title"))
			.filter(Boolean);

		const idx = (name: string) => items.indexOf(name);
		expect(idx("First Folder")).toBeLessThan(idx("Middle Reading"));
		expect(idx("Middle Reading")).toBeLessThan(idx("Last Folder"));
	});
});
