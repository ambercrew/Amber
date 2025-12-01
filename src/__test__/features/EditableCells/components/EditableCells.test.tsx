import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import EditableCells from "../../../../features/EditableCells/components/EditableCells";
import createDefaultCell from "../../../../features/EditableCells/utils/createDefaultCell";
import Cell from "../../../../types/backend/entity/cell";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { useState } from "react";

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

/** Render EditableCells with the given cells, recommended to use this function,
 * as it sets onCellsUpdateSave callback to re-render the component when called
 * as it would do in real situation.
 */
function renderEditableCells(
	props: Partial<Parameters<typeof EditableCells>[0]>,
) {
	const Component = () => {
		// This is to enforce the re-rendering of the editable-cells.
		"use no memo";
		const [, setState] = useState(false);

		return (
			<EditableCells
				fileMode="single"
				onError={vi.fn()}
				onCellsUpdateSave={() => {
					// Forcing a rerender to simulate real method.
					setState(s => !s);
					return Promise.resolve();
				}}
				cells={[]}
				{...props}
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

	it("Should not scroll when selected using click", () => {
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

		act(() => {
			screen.getByTestId("CellBlock-3").click();
		});

		// Assert

		expect(cellsScrolledTo).toHaveLength(0);
	});

	it("Should scroll when changing selected cell using ctrl + arrow down", () => {
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

		act(() => {
			const element = screen.getByTestId("CellBlock-2");
			fireEvent.keyDown(element, {
				key: "ArrowDown",
				ctrlKey: true,
			});
		});

		// Assert

		expect(cellsScrolledTo).toContain("CellBlock-2");
		expect(cellsScrolledTo).toHaveLength(1);
	});

	it("Should scroll when changing selected cell using ctrl + arrow up", () => {
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

		act(() => {
			fireEvent.keyDown(screen.getByTestId("CellBlock-3"), {
				key: "ArrowUp",
				ctrlKey: true,
			});
		});

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
		});

		// Act

		act(() => {
			const element = screen.getByTestId("CellBlock-2");
			element.click();
			fireEvent.keyDown(element, {
				key: "ArrowDown",
				ctrlKey: true,
				altKey: true,
			});
		});

		// Assert

		await waitFor(() => {
			expect(cellsScrolledTo).toContain("CellBlock-2");
			expect(cellsScrolledTo).toHaveLength(1);
		});
	});

	it("Should scroll when changing selected cell using ctrl + alt + arrow up", () => {
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
		});

		// Act

		act(() => {
			fireEvent.keyDown(screen.getByTestId("CellBlock-3"), {
				key: "ArrowUp",
				ctrlKey: true,
				altKey: true,
			});
		});

		// Assert

		expect(cellsScrolledTo).toContain("CellBlock-3");
		expect(cellsScrolledTo).toHaveLength(1);
	});
});
