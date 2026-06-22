import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import ScheduleLaterDialog from "../../../../features/IncrementalReading/components/ScheduleLaterDialog";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";

vi.mock(import("../../../../utils/tauriUtils.ts"), () => ({
	isAndroid: vi.fn(() => false),
}));

describe("ScheduleLaterDialog", () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("Should schedule for tomorrow at 9am when submitted with default preset", async () => {
		// Arrange

		const user = userEvent.setup();
		const onScheduleMock = vi.fn();

		renderWithProviders(
			<ScheduleLaterDialog
				onHide={vi.fn()}
				onSchedule={onScheduleMock}
			/>,
		);

		// Act

		await user.click(screen.getByText("Schedule"));

		// Assert

		expect(onScheduleMock).toHaveBeenCalledWith(
			new Date(2024, 0, 2, 9, 0, 0, 0),
		);
	});

	it("Should schedule in 30 minutes when 'Later today' preset is selected", async () => {
		// Arrange

		const user = userEvent.setup();
		const onScheduleMock = vi.fn();

		renderWithProviders(
			<ScheduleLaterDialog
				onHide={vi.fn()}
				onSchedule={onScheduleMock}
			/>,
		);

		// Act

		await user.click(screen.getByText("Later today"));
		await user.click(screen.getByText("Schedule"));

		// Assert

		expect(onScheduleMock).toHaveBeenCalledWith(
			new Date(2024, 0, 1, 12, 30, 0, 0),
		);
	});

	it("Should call onHide when cancel is clicked", async () => {
		// Arrange

		const user = userEvent.setup();
		const onHideMock = vi.fn();

		renderWithProviders(
			<ScheduleLaterDialog onHide={onHideMock} onSchedule={vi.fn()} />,
		);

		// Act

		await user.click(screen.getByText("Cancel"));

		// Assert

		expect(onHideMock).toHaveBeenCalled();
	});
});
