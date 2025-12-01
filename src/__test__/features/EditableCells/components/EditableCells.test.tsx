import { screen } from "@testing-library/react";
import EditableCells from "../../../../features/EditableCells/components/EditableCells";
import createDefaultCell from "../../../../features/EditableCells/utils/createDefaultCell";
import Cell from "../../../../types/backend/entity/cell";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { createCell } from "../../../../api/cellApi";

vi.mock(import("../../../../managers/closeRequestedEventManager"));
vi.mock(import("../../../../api/cellApi"));

/** Creates a cell for testing where the id is equal to the index.
 */
function createTestCell(index: number): Cell {
	const cell = createDefaultCell("Note", index + "", index);
	cell.id = index + "";
	return cell;
}

/** Sets the DOMRect for the elements with the given data-testid.
 */
function setBoundingClientRectByTestId(
	values: Record<string, Partial<DOMRect>>,
) {
	Element.prototype.getBoundingClientRect = function () {
		const testId = this.getAttribute("data-testid");
		if (!testId) return new DOMRect();

		return {
			...new DOMRect(),
			...(values[testId] ?? {}),
		};
	};
}

/** Helper function to render EditableCells.
 */
function renderEditableCells({
	cells: initialCells,
	initialSelectedCellId,
	onCellsUpdateSave,
}: {
	cells: Cell[];
	initialSelectedCellId?: string;
	/** This function can return new cells after the call to onUpdateSave. */
	onCellsUpdateSave?: () => Cell[];
}) {
	const Component = () => {
		const [cells, setCells] = useState(initialCells);

		return (
			<EditableCells
				fileMode="single"
				onError={vi.fn()}
				onCellsUpdateSave={() => {
					if (onCellsUpdateSave) {
						setCells(onCellsUpdateSave());
					}
					return Promise.resolve();
				}}
				cells={cells}
				initialSelectedCellId={initialSelectedCellId}
			/>
		);
	};

	return renderWithProviders(<Component />);
}

describe("EditableCells scrolling", () => {
	/** Cells which scrollIntoView was called on. */
	let cellsScrolledTo: string[];

	beforeEach(() => {
		cellsScrolledTo = [];

		Element.prototype.scrollIntoView = vi.fn().mockImplementation(function (
			this: Element,
		) {
			const testId = this.getAttribute("data-testid");
			if (testId?.startsWith("CellBlock-")) {
				cellsScrolledTo.push(testId);
			}
		});

		// @ts-expect-error IntersectionObserver is not found by default on the testing library.
		window.IntersectionObserver = class IntersectionObserver {
			constructor(cb: (entries: unknown[]) => void) {
				cb([
					{
						isIntersecting: true,
					},
				]);
			}

			observe = vi.fn();
			unobserve = vi.fn();
		};
	});

	it("Should scroll to initial selected cell", () => {
		// Arrange

		setBoundingClientRectByTestId({
			"CellBlock-2": {
				top: 20,
			},
			EditableCells: {
				top: 30,
			},
		});

		// Act

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
			initialSelectedCellId: "2",
		});

		// Assert

		expect(cellsScrolledTo).toContain("CellBlock-2");
		expect(cellsScrolledTo).toHaveLength(1);
	});

	it("Should not scroll when selected using click", async () => {
		// Arrange

		setBoundingClientRectByTestId({
			"CellBlock-3": {
				bottom: 30,
			},
			EditableCells: {
				bottom: 20,
			},
		});

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
		});

		// Act

		await userEvent.click(screen.getByTestId("CellBlock-3"));

		// Assert

		expect(cellsScrolledTo).toHaveLength(0);
	});

	it("Should scroll when changing selected cell using ctrl + arrow down", async () => {
		// Arrange

		setBoundingClientRectByTestId({
			"CellBlock-2": {
				bottom: 30,
			},
			EditableCells: {
				bottom: 20,
			},
		});

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
		});

		// Act

		await userEvent.keyboard("{Control>}{ArrowDown}");

		// Assert

		expect(cellsScrolledTo).toContain("CellBlock-2");
		expect(cellsScrolledTo).toHaveLength(1);
	});

	it("Should scroll when changing selected cell using ctrl + arrow up", async () => {
		// Arrange

		setBoundingClientRectByTestId({
			"CellBlock-2": {
				bottom: 30,
			},
			EditableCells: {
				bottom: 20,
			},
		});

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
			initialSelectedCellId: "3",
		});

		// Act

		await userEvent.keyboard("{Control>}{ArrowUp}");

		// Assert

		expect(cellsScrolledTo).toContain("CellBlock-2");
		expect(cellsScrolledTo).toHaveLength(1);
	});

	it("Should scroll when changing selected cell using ctrl + alt + arrow down", async () => {
		// Arrange

		setBoundingClientRectByTestId({
			"CellBlock-2": {
				bottom: 30,
			},
			EditableCells: {
				bottom: 20,
			},
		});

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
			onCellsUpdateSave: () => [
				createTestCell(1),
				createTestCell(3),
				createTestCell(2),
			],
		});

		// Act

		await userEvent.click(screen.getByTestId("CellBlock-2"));
		await userEvent.keyboard("{Control>}{Alt>}{ArrowDown}");

		// Assert

		expect(cellsScrolledTo).toContain("CellBlock-2");
		expect(cellsScrolledTo).toHaveLength(1);
	});

	it("Should scroll when changing selected cell using ctrl + alt + arrow up", async () => {
		// Arrange

		setBoundingClientRectByTestId({
			"CellBlock-3": {
				bottom: 30,
			},
			EditableCells: {
				bottom: 20,
			},
		});

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
			initialSelectedCellId: "3",
			onCellsUpdateSave: () => [
				createTestCell(1),
				createTestCell(3),
				createTestCell(2),
			],
		});

		// Act

		await userEvent.keyboard("{Control>}{Alt>}{ArrowUp}");

		// Assert

		expect(cellsScrolledTo).toContain("CellBlock-3");
		// Two times since first time is when initializing
		expect(cellsScrolledTo).toHaveLength(2);
	});
});
