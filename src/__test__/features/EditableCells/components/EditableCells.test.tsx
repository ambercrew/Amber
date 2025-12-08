import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import EditableCells from "../../../../features/EditableCells/components/EditableCells";
import createDefaultCell from "../../../../features/EditableCells/utils/createDefaultCell";
import Cell from "../../../../types/backend/entity/cell";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { createCell, deleteCell, moveCell } from "../../../../api/cellApi";
import useAutoSave from "../../../../features/EditableCells/hooks/useAutoSave";
import { Mock } from "vitest";
import { Procedure } from "@vitest/spy";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../../stores/sync/managers/syncEventManager";

vi.mock(import("../../../../managers/closeRequestedEventManager"));
vi.mock(import("../../../../api/cellApi"));
vi.mock(import("../../../../features/EditableCells/hooks/useAutoSave"));

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

		vi.mocked(useAutoSave).mockReturnValue({
			ignoreCell: vi.fn(),
			onCellContentUpdate: vi.fn(),
			saveChanges: vi.fn(),
		});
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

	it("Should scroll when inserting new cell", async () => {
		// Arrange

		setBoundingClientRectByTestId({
			"CellBlock-3": {
				bottom: 30,
			},
			EditableCells: {
				bottom: 20,
			},
		});

		vi.mocked(createCell).mockReturnValue(Promise.resolve("3"));

		const cells = [createTestCell(1), createTestCell(2)];
		renderEditableCells({
			cells,
			onCellsUpdateSave: () => [...cells, createTestCell(3)],
		});

		// Act

		await userEvent.click(screen.getByText("Add Cell"));
		await userEvent.click(screen.getByText("Cloze"));

		// Assert

		expect(cellsScrolledTo).toContain("CellBlock-3");
		expect(cellsScrolledTo).toHaveLength(1);
	});

	it("Should scroll when deleting Cell", async () => {
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
			onCellsUpdateSave: () => [createTestCell(1), createTestCell(2)],
		});

		// Act

		await userEvent.click(screen.getByTitle("Delete cell (Alt + Del)"));
		await userEvent.click(screen.getByText("Yes"));

		// Assert

		expect(cellsScrolledTo).toContain("CellBlock-2");
		expect(cellsScrolledTo).toHaveLength(1);
	});

	it("Should scroll when emptying search box", async () => {
		// Arrange

		setBoundingClientRectByTestId({
			"CellBlock-2": {
				bottom: 30,
			},
			EditableCells: {
				bottom: 20,
			},
		});

		const cells = [createTestCell(1), createTestCell(2), createTestCell(3)];

		const Component = () => {
			const [searchText, setSearchText] = useState("");

			return (
				<>
					<input
						type="text"
						value={searchText}
						onChange={e => setSearchText(e.target.value)}
						placeholder="search"
					/>
					<EditableCells
						fileMode="single"
						onError={vi.fn()}
						onCellsUpdateSave={vi.fn()}
						cells={cells}
						searchText={searchText}
						initialSelectedCellId="2"
					/>
				</>
			);
		};

		renderWithProviders(<Component />);

		// Act

		await userEvent.click(screen.getByPlaceholderText("search"));
		await userEvent.keyboard("test");
		await userEvent.keyboard(
			"{Backspace}{Backspace}{Backspace}{Backspace}",
		);

		// Assert

		expect(cellsScrolledTo).toContain("CellBlock-2");
		// Two due to first time.
		expect(cellsScrolledTo).toHaveLength(2);
	});

	it("Should scroll when dropping", async () => {
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

		act(() => {
			fireEvent.drop(screen.getByTestId("CellBlock-2"), {
				dataTransfer: {
					getData() {
						return "3";
					},
				},
			});
		});

		// Assert

		await waitFor(() => {
			expect(cellsScrolledTo).toContain("CellBlock-3");
			expect(cellsScrolledTo).toHaveLength(2);
		});
	});
});

describe("EditableCells logic", () => {
	let saveChangesMock: Mock<Procedure>;

	beforeEach(() => {
		saveChangesMock = vi.fn();

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

		vi.mocked(useAutoSave).mockReturnValue({
			ignoreCell: vi.fn(),
			onCellContentUpdate: vi.fn(),
			saveChanges: saveChangesMock,
		});
	});

	it("Should always select a cell at the start", () => {
		// Act

		renderEditableCells({
			cells: [createTestCell(1)],
		});

		// Assert

		const classList = screen.getByTestId("CellBlock-1").classList.value;
		expect(classList).contains("selected-cell");
	});

	it("Should call backend with correct arguments when dropping", async () => {
		// Arrange

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
		});

		// Act

		act(() => {
			fireEvent.drop(screen.getByTestId("CellBlock-2"), {
				dataTransfer: {
					getData() {
						return "3";
					},
				},
			});
		});

		// Assert

		await waitFor(() => {
			expect(saveChangesMock).toBeCalled();
			expect(vi.mocked(moveCell)).toBeCalledWith("3", 1);
		});
	});

	it("Should call backend with correct arguments and set new selected cell when deleting a cell", async () => {
		// Arrange

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
			initialSelectedCellId: "2",
		});

		// Act

		await userEvent.click(screen.getByTitle("Delete cell (Alt + Del)"));
		await userEvent.click(screen.getByText("Yes"));

		// Assert

		expect(saveChangesMock).toBeCalled();
		expect(vi.mocked(deleteCell)).toBeCalledWith("2");

		const classList = screen.getByTestId("CellBlock-1").classList.value;
		expect(classList).contains("selected-cell");
	});

	it("Should call backend with correct arguments and set new selected cell when inserting a new cell", async () => {
		// Arrange

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
			onCellsUpdateSave: () => [
				createTestCell(1),
				createTestCell(2),
				createTestCell(3),
				createTestCell(4),
			],
		});

		vi.mocked(createCell).mockReturnValue(Promise.resolve("4"));

		// Act

		await userEvent.click(
			screen.getByTitle("Insert Cell (Ctrl + Shift + Enter)"),
		);
		await userEvent.click(screen.getByText("True/False"));

		// Assert

		expect(saveChangesMock).toBeCalled();
		expect(vi.mocked(createCell)).toBeCalledWith(
			expect.objectContaining({
				cellType: "TrueFalse",
			}),
		);

		const classList = screen.getByTestId("CellBlock-4").classList.value;
		expect(classList).contains("selected-cell");
	});

	it("Should scroll back to correct position when sync is completed", async () => {
		// Arrange

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
		});
		const editableCells = screen.getByTestId("EditableCells");

		// Act

		editableCells.scrollTop = 100;
		await defaultGlobalSyncEventManager.notifyListeners(
			ListenerType.PreSyncStart,
		);
		editableCells.scrollTop = 400;
		await defaultGlobalSyncEventManager.notifyListeners(
			ListenerType.PostSyncComplete,
		);

		// Assert

		expect(editableCells.scrollTop).toBe(100);
	});
});
