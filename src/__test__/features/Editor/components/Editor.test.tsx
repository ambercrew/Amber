import userEvent from "@testing-library/user-event";
import Editor from "../../../../features/Editor/components/Editor";
import editorStyles from "../../../../features/Editor/components/styles.module.css";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import EditableCells from "../../../../features/EditableCells/components/EditableCells";
import { getStudyRepetitionCounts } from "../../../../api/repetitionApi";
import { getFileCellsOrderedByIndex } from "../../../../api/cellApi";
import Cell from "../../../../types/backend/entity/cell";
import createDefaultCell from "../../../../features/EditableCells/utils/createDefaultCell";

vi.mock(import("../../../../features/EditableCells/components/EditableCells"));
vi.mock(import("../../../../api/repetitionApi"));
vi.mock(import("../../../../api/cellApi"));

describe("TitleBar", () => {
	beforeAll(() => {
		vi.mocked(getStudyRepetitionCounts).mockReturnValue(
			Promise.resolve({
				new: 0,
				learning: 0,
				relearning: 0,
				review: 0,
			}),
		);
	});

	it("Should show and focus input when pressing ctrl + f", async () => {
		// Arrange

		renderWithProviders(
			<Editor
				initialSelectedCellId={null}
				onError={vi.fn()}
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
				onError={vi.fn()}
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
				onError={vi.fn()}
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
				onError={vi.fn()}
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
		vi.mocked(getStudyRepetitionCounts).mockReturnValue(
			Promise.resolve({
				new: 0,
				learning: 0,
				relearning: 0,
				review: 0,
			}),
		);
	});

	it("Should start study on F5 keyboard", async () => {
		// Arrange

		const onStudyStart = vi.fn();
		renderWithProviders(
			<Editor
				initialSelectedCellId={null}
				onError={vi.fn()}
				onStudyStart={onStudyStart}
			/>,
		);

		// Act

		await userEvent.keyboard("{F5}");

		// Assert

		expect(onStudyStart).toBeCalled();
	});

	it("Should retrieve initial state correctly", async () => {
		// Arrange

		vi.mocked(getStudyRepetitionCounts).mockReturnValue(
			Promise.resolve({
				new: 10,
				learning: 0,
				relearning: 0,
				review: 0,
			}),
		);
		const cells: Cell[] = [createDefaultCell("Note", "123", 1)];
		vi.mocked(getFileCellsOrderedByIndex).mockReturnValue(
			Promise.resolve(cells),
		);

		// Act

		renderWithProviders(
			<Editor
				initialSelectedCellId={null}
				onError={vi.fn()}
				onStudyStart={vi.fn()}
			/>,
		);

		// Assert

		await waitFor(() => {
			expect(screen.queryByText("New: 10")).not.toBeNull();
			expect(vi.mocked(EditableCells).mock.calls[1][0].cells).toBe(cells);
		});
	});

	it("Should retrieve repetitions every 60 seconds", async () => {
		// Arrange

		vi.useFakeTimers();
		vi.mocked(getStudyRepetitionCounts)
			.mockReturnValueOnce(
				Promise.resolve({
					new: 10,
					learning: 0,
					relearning: 0,
					review: 0,
				}),
			)
			.mockReturnValueOnce(
				Promise.resolve({
					new: 20,
					learning: 0,
					relearning: 0,
					review: 0,
				}),
			);

		// Act

		renderWithProviders(
			<Editor
				initialSelectedCellId={null}
				onError={vi.fn()}
				onStudyStart={vi.fn()}
			/>,
		);
		vi.advanceTimersByTime(60_000);
		vi.useRealTimers();

		// Assert

		await waitFor(() => {
			expect(screen.queryByText("New: 20")).not.toBeNull();
		});
	});
});
