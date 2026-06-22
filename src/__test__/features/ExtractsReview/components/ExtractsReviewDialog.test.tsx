import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import ExtractsReviewDialog, {
	CellToReview,
} from "../../../../features/ExtractsReview/components/ExtractsReviewDialog";
import {
	createClozeFromExtract,
	getPendingExtractsWithContent,
	updateExtractStatus,
} from "../../../../api/incrementalReading/api/extractsApi";
import { PendingExtractDto } from "../../../../api/incrementalReading/dto/pendingExtractDto";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";

vi.mock(import("../../../../api/incrementalReading/api/extractsApi.ts"));
vi.mock(import("../../../../api/aiIntegration/api/aiApi.ts"));
vi.mock(import("../../../../utils/tauriUtils.ts"), () => ({
	isAndroid: vi.fn(() => false),
	isMobile: vi.fn(() => false),
}));

describe("ExtractsReviewDialog", () => {
	const CELL_A: CellToReview = { id: "cell-a", title: "Cell A" };
	const CELL_B: CellToReview = { id: "cell-b", title: "Cell B" };

	function extract(
		id: string,
		innerHtml = "<p>content</p>",
	): PendingExtractDto {
		return { id, innerHtml };
	}

	it("Should call onClose when there are no cells to review", async () => {
		// Arrange

		const onCloseMock = vi.fn();

		// Act

		renderWithProviders(
			<ExtractsReviewDialog cells={[]} onClose={onCloseMock} />,
		);

		// Assert

		await waitFor(() => expect(onCloseMock).toHaveBeenCalled());
	});

	it("Should skip a cell with no pending extracts and load the next cell's extracts", async () => {
		// Arrange

		vi.mocked(getPendingExtractsWithContent).mockImplementation(cellId =>
			Promise.resolve(cellId === CELL_A.id ? [] : [extract("extract-1")]),
		);

		// Act

		renderWithProviders(
			<ExtractsReviewDialog cells={[CELL_A, CELL_B]} onClose={vi.fn()} />,
		);

		// Assert

		await waitFor(() =>
			expect(getPendingExtractsWithContent).toHaveBeenCalledWith(
				CELL_B.id,
			),
		);

		expect(await screen.findByText("Cell B")).toBeInTheDocument();
	});

	it("Should call createClozeFromExtract and advance when 'Save & next' is clicked", async () => {
		// Arrange

		const user = userEvent.setup();
		vi.mocked(getPendingExtractsWithContent).mockResolvedValue([
			extract("extract-1"),
			extract("extract-2"),
		]);

		renderWithProviders(
			<ExtractsReviewDialog cells={[CELL_A]} onClose={vi.fn()} />,
		);

		await screen.findByText("Highlight 1 of 2");

		// Act

		await user.click(screen.getByText("Save & next"));

		// Assert

		expect(vi.mocked(createClozeFromExtract)).toHaveBeenCalledWith(
			"extract-1",
			CELL_A.id,
			"<p>content</p>",
		);

		expect(await screen.findByText("Highlight 2 of 2")).toBeInTheDocument();
	});

	it("Should call updateExtractStatus with Dismissed when Dismiss is clicked", async () => {
		// Arrange

		const user = userEvent.setup();
		vi.mocked(getPendingExtractsWithContent).mockResolvedValue([
			extract("extract-1"),
		]);

		renderWithProviders(
			<ExtractsReviewDialog cells={[CELL_A]} onClose={vi.fn()} />,
		);

		await screen.findByText("Highlight 1 of 1");

		// Act

		await user.click(screen.getByText("Dismiss"));

		// Assert

		expect(vi.mocked(updateExtractStatus)).toHaveBeenCalledWith(
			"extract-1",
			"Dismissed",
		);
	});

	it("Should call onClose after the last extract of the last cell is handled", async () => {
		// Arrange

		const user = userEvent.setup();
		const onCloseMock = vi.fn();
		vi.mocked(getPendingExtractsWithContent).mockResolvedValue([
			extract("extract-1"),
		]);

		renderWithProviders(
			<ExtractsReviewDialog cells={[CELL_A]} onClose={onCloseMock} />,
		);

		await screen.findByText("Highlight 1 of 1");

		// Act

		await user.click(screen.getByText("Save & next"));

		// Assert

		expect(onCloseMock).toHaveBeenCalled();
	});
});
