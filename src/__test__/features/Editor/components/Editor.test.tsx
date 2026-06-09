import userEvent from "@testing-library/user-event";
import Editor from "../../../../features/Editor/components/Editor";
import editorStyles from "../../../../features/Editor/components/styles.module.css";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import EditableCells from "../../../../features/EditableCells/components/EditableCells";
import { getStudyRepetitionCounts } from "../../../../api/cells/api/repetitionApi";
import { getFileCellsOrderedByIndex } from "../../../../api/cells/api/cellApi";
import Cell from "../../../../api/cells/entities/cell";
import callApiMock from "../../../test-utils/callApiMock";
import createCreateCellRequestDto from "../../../../features/EditableCells/utils/createCreateCellRequestDto";

vi.mock(
	import("../../../../features/EditableCells/components/EditableCells"),
	async () => {
		const { forwardRef } = await import("react");
		const spy = vi.fn();
		const component = forwardRef(function EditableCells(props, ref) {
			spy({ ...props, ref });
			return null;
		});
		Object.defineProperty(component, "mock", { get: () => spy.mock });
		return { default: component };
	},
);
vi.mock(import("../../../../api/cells/api/repetitionApi"));
vi.mock(import("../../../../api/cells/api/cellApi"));

describe("TitleBar", () => {
	beforeAll(() => {
		vi.mocked(getStudyRepetitionCounts).mockResolvedValue({
			new: 0,
			learning: 0,
			relearning: 0,
			review: 0,
		});
	});

	it("Should show and focus input when pressing ctrl + f", async () => {
		// Arrange

		renderWithProviders(
			<Editor
				initialSelectedCellId={null}
				callApi={callApiMock}
				onStudyStart={vi.fn()}
			/>,
		);

		// Act

		await userEvent.keyboard("{Control>}f");

		// Assert

		const searchInput = screen.getByPlaceholderText("Search (Ctrl + F)");
		expect((searchInput?.parentNode as HTMLElement).classList).toContain(
			editorStyles.shown,
		);
		expect(searchInput).toBe(document.activeElement);
	});

	it("Should add shown class when input is focused", async () => {
		// Arrange

		renderWithProviders(
			<Editor
				initialSelectedCellId={null}
				callApi={callApiMock}
				onStudyStart={vi.fn()}
			/>,
		);
		const searchInput = screen.getByPlaceholderText("Search (Ctrl + F)");

		// Act

		await userEvent.click(searchInput);

		// Assert

		expect((searchInput?.parentNode as HTMLElement).classList).toContain(
			editorStyles.shown,
		);
	});

	it("Should remove shown class and empties search text when escape is pressed", async () => {
		// Arrange

		renderWithProviders(
			<Editor
				initialSelectedCellId={null}
				callApi={callApiMock}
				onStudyStart={vi.fn()}
			/>,
		);
		const searchInput = screen.getByPlaceholderText("Search (Ctrl + F)");
		await userEvent.click(searchInput);

		// Act

		await userEvent.keyboard("test{Escape}");

		// Assert

		expect(
			(searchInput?.parentNode as HTMLElement).classList,
		).not.toContain(editorStyles.shown);

		const editableCellsMockCalls = vi.mocked(EditableCells).mock.calls;
		expect(
			editableCellsMockCalls[editableCellsMockCalls.length - 1][0]
				.searchText,
		).toBe("");
	});

	it("Should not auto-focus editable cells when search-input is focused", async () => {
		// Arrange

		renderWithProviders(
			<Editor
				initialSelectedCellId={null}
				callApi={callApiMock}
				onStudyStart={vi.fn()}
			/>,
		);
		const searchInput = screen.getByPlaceholderText("Search (Ctrl + F)");
		const previousNumberOfCalls = vi
			.mocked(EditableCells)
			.mock.calls.filter(c => c[0].autoFocusEditor === false).length;

		// Act

		await userEvent.click(searchInput);

		// Assert

		const newNumberOfCalls = vi
			.mocked(EditableCells)
			.mock.calls.filter(c => c[0].autoFocusEditor === false).length;
		expect(newNumberOfCalls).toBe(previousNumberOfCalls + 1);
	});
});

describe("Editor", () => {
	beforeEach(() => {
		vi.mocked(getStudyRepetitionCounts).mockResolvedValue({
			new: 0,
			learning: 0,
			relearning: 0,
			review: 0,
		});
	});

	it("Should start study on F5 keyboard", async () => {
		// Arrange

		const onStudyStart = vi.fn();
		renderWithProviders(
			<Editor
				initialSelectedCellId={null}
				callApi={callApiMock}
				onStudyStart={onStudyStart}
			/>,
		);

		// Act

		await userEvent.keyboard("{F5}");

		// Assert

		expect(onStudyStart).toHaveBeenCalled();
	});

	it("Should retrieve initial state correctly", async () => {
		// Arrange

		vi.mocked(getStudyRepetitionCounts).mockResolvedValue({
			new: 10,
			learning: 0,
			relearning: 0,
			review: 0,
		});
		const cells: Cell[] = [
			createCreateCellRequestDto("Note", "123", 1) as Cell,
		];
		vi.mocked(getFileCellsOrderedByIndex).mockResolvedValue(cells);

		// Act

		renderWithProviders(
			<Editor
				initialSelectedCellId={null}
				callApi={callApiMock}
				onStudyStart={vi.fn()}
			/>,
		);

		// Assert

		await waitFor(() => {
			expect(
				screen.queryByText("New: 10", { exact: false }),
			).not.toBeNull();
			expect(vi.mocked(EditableCells).mock.calls[1][0].cells).toBe(cells);
		});
	});

	it("Should retrieve repetitions every 60 seconds", async () => {
		// Arrange

		vi.useFakeTimers();
		vi.mocked(getStudyRepetitionCounts)
			.mockResolvedValueOnce({
				new: 10,
				learning: 0,
				relearning: 0,
				review: 0,
			})
			.mockResolvedValueOnce({
				new: 20,
				learning: 0,
				relearning: 0,
				review: 0,
			});

		// Act

		renderWithProviders(
			<Editor
				initialSelectedCellId={null}
				callApi={callApiMock}
				onStudyStart={vi.fn()}
			/>,
		);
		vi.advanceTimersByTime(60_000);
		vi.useRealTimers();

		// Assert

		await waitFor(() => {
			expect(
				screen.queryByText("New: 20", { exact: false }),
			).not.toBeNull();
		});
	});
});
