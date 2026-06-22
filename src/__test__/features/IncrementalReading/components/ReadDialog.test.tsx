import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import ReadDialog from "../../../../features/IncrementalReading/components/ReadDialog";
import IncrementalReading from "../../../../api/cells/valueObjects/incrementalReading";
import { scheduleIncrementalReadingLater } from "../../../../api/incrementalReading/api/incrementalReadingApi";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";

type IncrementalReadingUpdater = (
	current: IncrementalReading,
) => Partial<IncrementalReading>;

vi.mock(
	import("../../../../api/incrementalReading/api/incrementalReadingApi.ts"),
);
vi.mock(import("../../../../utils/tauriUtils.ts"), () => ({
	isAndroid: vi.fn(() => false),
	isMobile: vi.fn(() => false),
}));

describe("ReadDialog", () => {
	const CELL_ID = "cell-1";
	const INCREMENTAL_READING: IncrementalReading = {
		content: "<p>content</p>",
		title: "My article",
		source: { type: "url", url: "https://example.com" },
		priority: "normal",
		completed: false,
		scrollPosition: null,
	};

	it("Should call onClose when Exit is clicked", async () => {
		// Arrange

		const user = userEvent.setup();
		const onCloseMock = vi.fn();

		renderWithProviders(
			<ReadDialog
				cellId={CELL_ID}
				incrementalReading={INCREMENTAL_READING}
				onChange={vi.fn()}
				onClose={onCloseMock}
			/>,
		);

		// Act

		await user.click(screen.getByTitle("Close without rescheduling"));

		// Assert

		expect(onCloseMock).toHaveBeenCalled();
	});

	it("Should mark as completed and close when Done is clicked", async () => {
		// Arrange

		const user = userEvent.setup();
		const onChangeMock =
			vi.fn<(updater: IncrementalReadingUpdater) => void>();
		const onCloseMock = vi.fn();

		renderWithProviders(
			<ReadDialog
				cellId={CELL_ID}
				incrementalReading={INCREMENTAL_READING}
				onChange={onChangeMock}
				onClose={onCloseMock}
			/>,
		);

		// Act

		await user.click(screen.getByTitle("Mark as completed"));

		// Assert

		const updater = onChangeMock.mock.calls[0][0];
		expect(updater(INCREMENTAL_READING)).toEqual({ completed: true });
		expect(onCloseMock).toHaveBeenCalled();
	});

	it("Should call onChange with the new priority when a priority option is selected", async () => {
		// Arrange

		const user = userEvent.setup();
		const onChangeMock =
			vi.fn<(updater: IncrementalReadingUpdater) => void>();

		renderWithProviders(
			<ReadDialog
				cellId={CELL_ID}
				incrementalReading={INCREMENTAL_READING}
				onChange={onChangeMock}
				onClose={vi.fn()}
			/>,
		);

		// Act

		await user.click(screen.getByText("Normal"));
		await user.click(screen.getByText("High"));

		// Assert

		const updater = onChangeMock.mock.calls[0][0];
		expect(updater(INCREMENTAL_READING)).toEqual({ priority: "high" });
	});

	it("Should schedule for later, update completed state and close when scheduling is confirmed", async () => {
		// Arrange

		const user = userEvent.setup();
		const onChangeMock =
			vi.fn<(updater: IncrementalReadingUpdater) => void>();
		const onCloseMock = vi.fn();

		renderWithProviders(
			<ReadDialog
				cellId={CELL_ID}
				incrementalReading={INCREMENTAL_READING}
				onChange={onChangeMock}
				onClose={onCloseMock}
			/>,
		);

		// Act

		await user.click(screen.getByTitle("Continue reading later"));
		await user.click(await screen.findByText("Schedule"));

		// Assert

		expect(vi.mocked(scheduleIncrementalReadingLater)).toHaveBeenCalledWith(
			CELL_ID,
			expect.any(Date),
		);

		const updater = onChangeMock.mock.calls[0][0];
		expect(updater(INCREMENTAL_READING)).toEqual({ completed: false });
		expect(onCloseMock).toHaveBeenCalled();
	});
});
