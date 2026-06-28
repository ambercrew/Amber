import { TreeNodeData } from "@mantine/core";
import { isDropAllowed } from "../../../../features/Sidebar/utils/elementTreeUtils";

// Tree shape:
//   folder-a  (root folder)
//     reading-a  (inside folder-a)
//       extract-a  (inside reading-a)
//         card-a   (inside extract-a)
//       card-b     (inside reading-a)
//     extract-b  (inside folder-a, direct child)
//     card-c     (inside folder-a, direct child)
//   folder-b  (root folder, sibling of folder-a)

const DATA: TreeNodeData[] = [
	{
		value: "folder-a",
		label: "Folder A",
		nodeProps: { type: "folder", childrenCount: 3 },
		children: [
			{
				value: "reading-a",
				label: "Reading A",
				nodeProps: { type: "reading", childrenCount: 2 },
				children: [
					{
						value: "extract-a",
						label: "Extract A",
						nodeProps: { type: "extract", childrenCount: 1 },
						children: [
							{
								value: "card-a",
								label: "Card A",
								nodeProps: { type: "card", childrenCount: 0 },
							},
						],
					},
					{
						value: "card-b",
						label: "Card B",
						nodeProps: { type: "card", childrenCount: 0 },
					},
				],
			},
			{
				value: "extract-b",
				label: "Extract B",
				nodeProps: { type: "extract", childrenCount: 0 },
			},
			{
				value: "card-c",
				label: "Card C",
				nodeProps: { type: "card", childrenCount: 0 },
			},
		],
	},
	{
		value: "folder-b",
		label: "Folder B",
		nodeProps: { type: "folder", childrenCount: 0 },
	},
];

function drop(
	draggedNode: string,
	targetNode: string,
	position: "inside" | "before" | "after",
) {
	return isDropAllowed(DATA, { draggedNode, targetNode, position });
}

// ─── folder ──────────────────────────────────────────────────────────────────

describe("folder drop targets", () => {
	it("Should allow dropping a folder inside another folder", () => {
		expect(drop("folder-b", "folder-a", "inside")).toBe(true);
	});

	it("Should allow dropping a folder before a root folder (root level)", () => {
		expect(drop("folder-b", "folder-a", "before")).toBe(true);
	});

	it("Should allow dropping a folder after a root folder (root level)", () => {
		expect(drop("folder-b", "folder-a", "after")).toBe(true);
	});

	it("Should not allow dropping a folder inside a reading", () => {
		expect(drop("folder-b", "reading-a", "inside")).toBe(false);
	});

	it("Should not allow dropping a folder inside an extract", () => {
		expect(drop("folder-b", "extract-a", "inside")).toBe(false);
	});

	it("Should not allow dropping a folder inside a card", () => {
		expect(drop("folder-b", "card-a", "inside")).toBe(false);
	});
});

// ─── reading ─────────────────────────────────────────────────────────────────

describe("reading drop targets", () => {
	it("Should allow dropping a reading inside a folder", () => {
		expect(drop("reading-a", "folder-a", "inside")).toBe(true);
	});

	it("Should allow dropping a reading before a sibling inside a folder", () => {
		// extract-b is inside folder-a, so before/after it = sibling inside folder
		expect(drop("reading-a", "extract-b", "before")).toBe(true);
	});

	it("Should not allow dropping a reading at root level", () => {
		expect(drop("reading-a", "folder-a", "before")).toBe(false);
	});

	it("Should not allow dropping a reading inside a reading", () => {
		expect(drop("reading-a", "reading-a", "inside")).toBe(false);
	});

	it("Should not allow dropping a reading inside an extract", () => {
		expect(drop("reading-a", "extract-a", "inside")).toBe(false);
	});
});

// ─── extract ─────────────────────────────────────────────────────────────────

describe("extract drop targets", () => {
	it("Should allow dropping an extract inside a folder", () => {
		expect(drop("extract-a", "folder-a", "inside")).toBe(true);
	});

	it("Should allow dropping an extract inside a reading", () => {
		expect(drop("extract-a", "reading-a", "inside")).toBe(true);
	});

	it("Should allow dropping an extract before a sibling inside a reading", () => {
		// card-b is inside reading-a
		expect(drop("extract-a", "card-b", "before")).toBe(true);
	});

	it("Should allow dropping an extract before a sibling inside another extract", () => {
		// card-a is inside extract-a
		expect(drop("extract-b", "card-a", "before")).toBe(true);
	});

	it("Should not allow dropping an extract at root level", () => {
		expect(drop("extract-b", "folder-a", "before")).toBe(false);
	});

	it("Should allow dropping an extract inside another extract", () => {
		expect(drop("extract-b", "extract-a", "inside")).toBe(true);
	});

	it("Should not allow dropping an extract inside a card", () => {
		expect(drop("extract-b", "card-a", "inside")).toBe(false);
	});
});

// ─── card ─────────────────────────────────────────────────────────────────────

describe("card drop targets", () => {
	it("Should allow dropping a card inside a folder", () => {
		expect(drop("card-a", "folder-a", "inside")).toBe(true);
	});

	it("Should allow dropping a card inside a reading", () => {
		expect(drop("card-a", "reading-a", "inside")).toBe(true);
	});

	it("Should allow dropping a card inside an extract", () => {
		expect(drop("card-a", "extract-a", "inside")).toBe(true);
	});

	it("Should allow dropping a card before a sibling inside an extract", () => {
		// card-a is inside extract-a
		expect(drop("card-b", "card-a", "before")).toBe(true);
	});

	it("Should not allow dropping a card at root level", () => {
		expect(drop("card-a", "folder-a", "before")).toBe(false);
	});

	it("Should not allow dropping a card inside a card", () => {
		expect(drop("card-a", "card-b", "inside")).toBe(false);
	});
});
