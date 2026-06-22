import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import NewCellTypeSelector from "../../../../features/EditableCells/components/NewCellTypeSelector";
import userEvent from "@testing-library/user-event";
import { CellType } from "../../../../api/cells/entities/cell";

vi.mock(import("../../../../utils/tauriUtils.ts"), () => ({
	isAndroid: vi.fn(() => true),
}));

describe("NewCellTypeSelector", () => {
	it("Should be able to navigate with arrow down", async () => {
		// Arrange

		const onClick = vi.fn();
		renderWithProviders(
			<NewCellTypeSelector onClick={onClick} onHide={vi.fn()} />,
		);

		// Act

		await userEvent.keyboard("{ArrowDown>2}{Enter}");

		// Assert

		expect(onClick).toHaveBeenCalledWith("Note" as CellType);
	});

	it("Should be able to navigate with arrow up", async () => {
		// Arrange

		const onClick = vi.fn();
		renderWithProviders(
			<NewCellTypeSelector onClick={onClick} onHide={vi.fn()} />,
		);

		// Act

		await userEvent.keyboard("{ArrowUp}{Enter}");

		// Assert

		expect(onClick).toHaveBeenCalledWith("IncrementalReading" as CellType);
	});

	it("Should be able to retain search choice", async () => {
		// Arrange

		const onClick = vi.fn();
		renderWithProviders(
			<NewCellTypeSelector onClick={onClick} onHide={vi.fn()} />,
		);

		// Act

		await userEvent.keyboard("Note{Backspace>4}{Enter}");

		// Assert

		expect(onClick).toHaveBeenCalledWith("Note" as CellType);
	});

	it("Should do nothing when pressing enter and no search results are found", async () => {
		// Arrange

		const onClick = vi.fn();
		renderWithProviders(
			<NewCellTypeSelector onClick={onClick} onHide={vi.fn()} />,
		);

		// Act

		await userEvent.keyboard("Not found{Enter}");

		// Assert

		expect(onClick).not.toHaveBeenCalled();
	});
});
