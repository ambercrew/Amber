import { fireEvent, screen, waitFor } from "@testing-library/react";
import EditableCells from "../../../../features/EditableCells/components/EditableCells";
import buildDefaultCreateCellRequest from "../../../../features/EditableCells/utils/buildDefaultCreateCellRequest";
import Cell from "../../../../api/cells/entities/cell.ts";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import {
	createCell,
	deleteCell,
	moveCell,
} from "../../../../api/cells/api/cellApi.ts";
import useAutoSave from "../../../../features/EditableCells/hooks/useAutoSave";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../../stores/sync/managers/syncEventManager";
import {
	mockDndKit,
	mockUseDraggable,
	mockUseDroppable,
	mockUseDragDropMonitor,
} from "../../../test-utils/dndMocks.tsx";
import CellDropContainerData, {
	CELL_DROP_CONTAINER_TYPE,
} from "../../../../features/EditableCells/types/cellDropContainerData.ts";
import DraggedCellData, {
	DRAGGED_CELL_TYPE,
} from "../../../../features/EditableCells/types/draggedCellData.ts";
import { DragDropEventHandlers } from "@dnd-kit/react";
import { Feedback } from "@dnd-kit/dom";
import callApiMock from "../../../test-utils/callApiMock.ts";
import {
	CELL_MOVED_TO_FILE,
	CellMovedToFilePayload,
} from "../../../../types/events/cellMovedToFileEvent.ts";

vi.mock(import("../../../../managers/closeRequestedEventManager"));
vi.mock(import("../../../../api/cells/api/cellApi.ts"));
vi.mock(import("../../../../features/EditableCells/hooks/useAutoSave"));
vi.mock(import("../../../../utils/tauriUtils.ts"));
vi.mock(import("@dnd-kit/react"));

/** Creates a cell for testing where the id is equal to the index.
 */
function createTestCell(index: number): Cell {
	const request = buildDefaultCreateCellRequest("Note", index + "", index);
	const cell: Cell = {
		...request,
		id: index + "",
		searchableContent: "",
		index,
		repetitions: [],
	};
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
	const saveChangesMock = vi.fn();

	const Component = () => {
		const [cells, setCells] = useState(initialCells);

		saveChangesMock.mockImplementation(() => {
			// Wrapping in a promise to make it act like a real promise.
			void Promise.resolve().then(() => {
				if (onCellsUpdateSave) {
					setCells(onCellsUpdateSave());
				}
			});
		});

		vi.mocked(useAutoSave).mockReturnValue({
			ignoreCell: vi.fn(),
			onCellContentUpdate: vi.fn(),
			saveChanges: saveChangesMock,
		});

		return (
			<EditableCells
				fileMode="single"
				callApi={callApiMock}
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

	return { ...renderWithProviders(<Component />), saveChangesMock };
}

function createDragEndEventArg(
	sourceData: DraggedCellData,
	containerData: CellDropContainerData,
) {
	return {
		operation: {
			source: {
				type: DRAGGED_CELL_TYPE,
				data: sourceData,
			},
			target: {
				type: CELL_DROP_CONTAINER_TYPE,
				data: containerData,
			},
		},
	};
}

describe("Scrolling", () => {
	/** Cells which scrollIntoView was called on. */
	let cellsScrolledIntoView: string[];

	/** Elements on which scrollTo was called on. */
	let elementsScrolledTo: { testId: string; top: number }[];

	beforeEach(() => {
		cellsScrolledIntoView = [];
		elementsScrolledTo = [];

		Element.prototype.scrollIntoView = vi.fn().mockImplementation(function (
			this: Element,
		) {
			const testId = this.getAttribute("data-testid");
			if (testId?.startsWith("CellBlock-")) {
				cellsScrolledIntoView.push(testId);
			}
		});

		Element.prototype.scrollTo = vi.fn().mockImplementation(function (
			this: Element,
			options: ScrollToOptions,
		) {
			const testId = this.getAttribute("data-testid");
			if (testId) {
				elementsScrolledTo.push({ testId, top: options.top! });
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

		mockDndKit();
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

		expect(cellsScrolledIntoView).toContain("CellBlock-2");
		expect(cellsScrolledIntoView).toHaveLength(1);
	});

	it("Should scroll to the end of the editable cells when scrolling to the last cell", () => {
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
			cells: [createTestCell(1), createTestCell(2)],
			initialSelectedCellId: "2",
		});

		// Assert

		const editableCells = screen.getByTestId("EditableCells");
		expect(elementsScrolledTo).toContainEqual({
			testId: "EditableCells",
			top: editableCells.scrollHeight,
		});
		expect(elementsScrolledTo).toHaveLength(1);
	});

	it("Should scroll to the start of the editable cells when scrolling to the first cell", () => {
		// Arrange

		setBoundingClientRectByTestId({
			"CellBlock-1": {
				top: 20,
			},
			EditableCells: {
				top: 30,
			},
		});

		// Act

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2)],
			initialSelectedCellId: "1",
		});

		// Assert

		expect(elementsScrolledTo).toContainEqual({
			testId: "EditableCells",
			top: 0,
		});
		expect(elementsScrolledTo).toHaveLength(1);
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

		expect(cellsScrolledIntoView).toHaveLength(0);
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
			initialSelectedCellId: "1",
		});

		// Act

		await userEvent.keyboard("{Control>}{ArrowDown}");

		// Assert

		expect(cellsScrolledIntoView).toContain("CellBlock-2");
		expect(cellsScrolledIntoView).toHaveLength(1);
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

		expect(cellsScrolledIntoView).toContain("CellBlock-2");
		expect(cellsScrolledIntoView).toHaveLength(1);
	});

	it("Should scroll when moving selected cell using ctrl + alt + arrow down", async () => {
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
			cells: [
				createTestCell(1),
				createTestCell(2),
				createTestCell(3),
				createTestCell(4),
			],
			onCellsUpdateSave: () => [
				createTestCell(1),
				createTestCell(3),
				createTestCell(2),
				createTestCell(4),
			],
		});

		// Act

		await userEvent.click(screen.getByTestId("CellBlock-2"));
		await userEvent.keyboard("{Control>}{Alt>}{ArrowDown}");

		// Assert

		expect(cellsScrolledIntoView).toContain("CellBlock-2");
		expect(cellsScrolledIntoView).toHaveLength(1);
	});

	it("Should scroll when moving selected cell using ctrl + alt + arrow up", async () => {
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
			cells: [
				createTestCell(1),
				createTestCell(2),
				createTestCell(3),
				createTestCell(4),
			],
			initialSelectedCellId: "3",
			onCellsUpdateSave: () => [
				createTestCell(1),
				createTestCell(3),
				createTestCell(2),
				createTestCell(4),
			],
		});

		// Act

		await userEvent.keyboard("{Control>}{Alt>}{ArrowUp}");

		// Assert

		expect(cellsScrolledIntoView).toContain("CellBlock-3");
		// Two times since first time is when initializing
		expect(cellsScrolledIntoView).toHaveLength(2);
	});

	it("Should scroll when inserting new cell", async () => {
		// Arrange

		setBoundingClientRectByTestId({
			"CellBlock-4": {
				bottom: 30,
			},
			EditableCells: {
				bottom: 20,
			},
		});

		vi.mocked(createCell).mockResolvedValue("4");

		const cells = [createTestCell(1), createTestCell(2), createTestCell(3)];
		const { store } = renderEditableCells({
			cells,
			onCellsUpdateSave: () => [...cells, createTestCell(4)],
			initialSelectedCellId: "2",
		});

		// Act

		await userEvent.click(screen.getByText("Add Cell"));
		await userEvent.click(screen.getByText("Cloze"));

		// Assert

		expect(elementsScrolledTo).toContainEqual({
			testId: "EditableCells",
			// It should equal client height, but hard to mock.
			top: 0,
		});
		expect(elementsScrolledTo).toHaveLength(1);
		expect(store.getState().ai.focusedCellId).toBe("4");
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
			cells: [
				createTestCell(1),
				createTestCell(2),
				createTestCell(3),
				createTestCell(4),
			],
			initialSelectedCellId: "3",
			onCellsUpdateSave: () => [
				createTestCell(1),
				createTestCell(2),
				createTestCell(4),
			],
		});

		// Act

		await userEvent.click(screen.getByTitle("Actions"));
		await userEvent.click(screen.getByText("Delete cell"));
		await userEvent.click(screen.getByText("Yes"));

		// Assert

		expect(cellsScrolledIntoView).toContain("CellBlock-2");
		expect(cellsScrolledIntoView).toHaveLength(1);
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
						callApi={callApiMock}
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

		expect(cellsScrolledIntoView).toContain("CellBlock-2");
		// Two due to first time.
		expect(cellsScrolledIntoView).toHaveLength(2);
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

		const { getCapturedMonitorHandlers } = mockUseDragDropMonitor();
		const dragEndEventArg = createDragEndEventArg(
			{
				cellId: "3",
			},
			{
				type: "cell",
				cellId: "2",
			},
		);

		renderEditableCells({
			cells: [
				createTestCell(1),
				createTestCell(2),
				createTestCell(3),
				createTestCell(4),
			],
			initialSelectedCellId: "3",
			onCellsUpdateSave: () => [
				createTestCell(1),
				createTestCell(3),
				createTestCell(2),
				createTestCell(4),
			],
		});

		// Act

		const handlers = getCapturedMonitorHandlers();
		handlers[0].onDragEnd!(
			dragEndEventArg as unknown as Parameters<
				DragDropEventHandlers["onDragEnd"]
			>[0],
			null as unknown as Parameters<
				DragDropEventHandlers["onDragEnd"]
			>[1],
		);

		// Assert

		await waitFor(() => {
			expect(cellsScrolledIntoView).toContain("CellBlock-3");
			expect(cellsScrolledIntoView).toHaveLength(2);
		});
	});
});

describe("EditableCells logic", () => {
	beforeEach(() => {
		Element.prototype.scrollTo = vi.fn();

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

		mockDndKit();
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

		const { getCapturedMonitorHandlers } = mockUseDragDropMonitor();
		const dragEndEventArg = createDragEndEventArg(
			{
				cellId: "2",
			},
			{
				type: "cell",
				cellId: "1",
			},
		);

		const { saveChangesMock } = renderEditableCells({
			cells: [createTestCell(0), createTestCell(1), createTestCell(2)],
		});

		// Act

		const handlers = getCapturedMonitorHandlers();
		handlers[0].onDragEnd!(
			dragEndEventArg as unknown as Parameters<
				DragDropEventHandlers["onDragEnd"]
			>[0],
			null as unknown as Parameters<
				DragDropEventHandlers["onDragEnd"]
			>[1],
		);

		// Assert

		await waitFor(() => {
			expect(saveChangesMock).toHaveBeenCalled();
			expect(vi.mocked(moveCell)).toHaveBeenCalledWith("2", 1);
		});
	});

	it("Should call backend with correct arguments when dropping after forward", async () => {
		// Arrange

		const { getCapturedMonitorHandlers } = mockUseDragDropMonitor();
		const dragEndEventArg = createDragEndEventArg(
			{
				cellId: "1",
			},
			{
				type: "cell",
				cellId: "3",
			},
		);

		const { saveChangesMock } = renderEditableCells({
			cells: [
				createTestCell(0),
				createTestCell(1),
				createTestCell(2),
				createTestCell(3),
				createTestCell(4),
			],
		});

		// Act

		const handlers = getCapturedMonitorHandlers();
		handlers[0].onDragEnd!(
			dragEndEventArg as unknown as Parameters<
				DragDropEventHandlers["onDragEnd"]
			>[0],
			null as unknown as Parameters<
				DragDropEventHandlers["onDragEnd"]
			>[1],
		);

		// Assert

		await waitFor(() => {
			expect(saveChangesMock).toHaveBeenCalled();
			expect(vi.mocked(moveCell)).toHaveBeenCalledWith("1", 2);
		});
	});

	it("Should call backend with correct arguments and set new selected cell when deleting a cell", async () => {
		// Arrange

		const { saveChangesMock } = renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
			initialSelectedCellId: "2",
			onCellsUpdateSave: () => {
				return [createTestCell(1), createTestCell(3)];
			},
		});

		// Act

		await userEvent.click(screen.getByTitle("Actions"));
		await userEvent.click(screen.getByText("Delete cell"));
		await userEvent.click(screen.getByText("Yes"));

		// Assert

		expect(saveChangesMock).toHaveBeenCalled();
		expect(vi.mocked(deleteCell)).toHaveBeenCalledWith("2");

		const classList = screen.getByTestId("CellBlock-1").classList.value;
		expect(classList).contains("selected-cell");
	});

	it("Should call backend with correct arguments and set new selected cell when inserting a new cell", async () => {
		// Arrange

		const { saveChangesMock } = renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
			onCellsUpdateSave: () => [
				createTestCell(1),
				createTestCell(2),
				createTestCell(3),
				createTestCell(4),
			],
		});

		vi.mocked(createCell).mockResolvedValue("4");

		// Act

		await userEvent.click(screen.getByTitle("Actions"));
		await userEvent.click(screen.getByText("Insert cell below"));
		await userEvent.click(screen.getByText("True/False"));

		// Assert

		expect(saveChangesMock).toHaveBeenCalled();
		expect(vi.mocked(createCell)).toHaveBeenCalledWith(
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

	it("Should called backend with correct arguments when moving selected cell using ctrl + alt + arrow up", async () => {
		// Arrange

		renderEditableCells({
			cells: [createTestCell(0), createTestCell(1), createTestCell(2)],
			initialSelectedCellId: "2",
		});

		// Act

		await userEvent.keyboard("{Control>}{Alt>}{ArrowUp}");

		// Assert

		// Indexing start from zero.
		expect(vi.mocked(moveCell)).toHaveBeenCalledWith("2", 1);
	});

	it("Should called backend with correct arguments when moving selected cell using ctrl + alt + arrow down", async () => {
		// Arrange

		renderEditableCells({
			cells: [createTestCell(0), createTestCell(1), createTestCell(2)],
			initialSelectedCellId: "1",
		});

		// Act

		await userEvent.keyboard("{Control>}{Alt>}{ArrowDown}");

		// Assert

		// Indexing start from zero.
		expect(vi.mocked(moveCell)).toHaveBeenCalledWith("1", 2);
	});

	it("Should not call the backend when moving to invalid place using shortcuts (ctrl + alt + arrow down)", async () => {
		// Arrange

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
			initialSelectedCellId: "3",
		});

		// Act

		await userEvent.keyboard("{Control>}{Alt>}{ArrowDown}");

		// Assert

		expect(vi.mocked(moveCell)).not.toHaveBeenCalled();
	});

	it("Should not call the backend when moving to invalid place using shortcuts (ctrl + alt + arrow up)", async () => {
		// Arrange

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
			initialSelectedCellId: "1",
		});

		// Act

		await userEvent.keyboard("{Control>}{Alt>}{ArrowUp}");

		// Assert

		expect(vi.mocked(moveCell)).not.toHaveBeenCalled();
	});

	it("Should re-focus last focused element when insert new cell is hidden", async () => {
		// Arrange

		renderEditableCells({
			cells: [createTestCell(1)],
			initialSelectedCellId: "1",
		});
		const element = screen.getByRole("textbox");

		// Act

		await userEvent.click(element);
		expect(element).toBe(document.activeElement);
		await userEvent.keyboard("{Control>}{Enter}");
		expect(element).not.toBe(document.activeElement);
		await userEvent.keyboard("{Escape}");

		// Assert

		expect(element).toBe(document.activeElement);
	});

	it("Should set drag and drop data correctly", () => {
		// Arrange

		const { getUseDraggableInputs } = mockUseDraggable();
		const { getUseDroppableInputs } = mockUseDroppable();

		// Act

		renderEditableCells({
			cells: [createTestCell(1)],
			initialSelectedCellId: "1",
		});

		// Assert

		const draggableInputs = getUseDraggableInputs();
		expect(draggableInputs[0]).toMatchObject({
			id: "draggable-1",
			type: DRAGGED_CELL_TYPE,
			data: {
				cellId: "1",
			} as DraggedCellData,
			plugins: [
				Feedback.configure({ feedback: "clone", dropAnimation: null }),
			],
		});

		const draggableOutputs = getUseDroppableInputs();
		expect(draggableOutputs[0]).toStrictEqual({
			id: "droppable-1",
			type: CELL_DROP_CONTAINER_TYPE,
			disabled: false,
			data: {
				type: "cell",
				cellId: "1",
			} as CellDropContainerData,
		});
		// The droppable component re-renders twice.
		expect(draggableOutputs[2]).toStrictEqual({
			id: "add-cell-container",
			type: CELL_DROP_CONTAINER_TYPE,
			data: {
				type: "add-cell-container",
			} as CellDropContainerData,
		});
	});

	it("Should select previous cell when selected cell is moved to another file", async () => {
		// Arrange

		const { saveChangesMock } = renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
			initialSelectedCellId: "2",
			onCellsUpdateSave: () => [createTestCell(1), createTestCell(3)],
		});

		// Act

		fireEvent(
			window,
			new CustomEvent<CellMovedToFilePayload>(CELL_MOVED_TO_FILE, {
				detail: { cellId: "2" },
			}),
		);
		saveChangesMock();

		// Assert

		await waitFor(() => {
			expect(screen.getByTestId("CellBlock-1").classList.value).toContain(
				"selected-cell",
			);
		});
	});

	it("Should not change selection when a different cell is moved to another file", () => {
		// Arrange

		renderEditableCells({
			cells: [createTestCell(1), createTestCell(2), createTestCell(3)],
			initialSelectedCellId: "2",
			onCellsUpdateSave: () => [createTestCell(1), createTestCell(2)],
		});

		// Act

		fireEvent(
			window,
			new CustomEvent<CellMovedToFilePayload>(CELL_MOVED_TO_FILE, {
				detail: { cellId: "3" },
			}),
		);

		// Assert

		expect(screen.getByTestId("CellBlock-2").classList.value).toContain(
			"selected-cell",
		);
	});
});
