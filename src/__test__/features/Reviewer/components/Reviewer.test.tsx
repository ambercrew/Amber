import styles from "../../../../features/Reviewer/components/styles.module.css";
import { screen } from "@testing-library/react";
import { getCellsForFilesWithFsrsProfileIds } from "../../../../api/cells/api/cellApi.ts";
import Reviewer from "../../../../features/Reviewer/components/Reviewer.tsx";
import { CellWithFsrsProfileIdDto } from "../../../../api/cells/dto/cellWithFsrsProfileIdDto.ts";
import Cell from "../../../../api/cells/entities/cell.ts";
import Repetition from "../../../../api/cells/entities/repetition.ts";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.tsx";
import { getAllFsrsProfiles } from "../../../../api/fsrs/api/fsrsApi.ts";
import FsrsProfile from "../../../../api/fsrs/entities/fsrsProfile.ts";
import userEvent from "@testing-library/user-event";
import { registerReview } from "../../../../api/cells/api/reviewApi.ts";
import { FSRS, generatorParameters } from "ts-fsrs";
import createCardFromRepetition from "../../../../features/Reviewer/utils/createCardFromRepetition.ts";
import createRepetitionFromCard from "../../../../features/Reviewer/utils/createRepetitionFromCard.ts";
import { getCurrentLocation } from "../../../test-utils/locationUtils.ts";
import callApiMock from "../../../test-utils/callApiMock.ts";

vi.mock(import("../../../../api/fsrs/api/fsrsApi.ts"));
vi.mock(import("../../../../api/cells/api/cellApi.ts"));
vi.mock(import("../../../../api/cells/api/reviewApi.ts"));

function addMinutes(date: Date, minutes: number) {
	date.setMinutes(date.getMinutes() + minutes);
	return date;
}

describe("Reviewer", () => {
	it("Should show counts correctly and sorts correctly", async () => {
		// Arrange

		const cellsWithFsrsProfileIds: CellWithFsrsProfileIdDto[] = [
			{
				cell: {
					repetitions: [
						{
							state: "new",
							due: addMinutes(new Date(), 10).toISOString(),
						} as Repetition,
						{
							state: "new",
							due: addMinutes(new Date(), -20).toISOString(),
						} as Repetition,
						{
							state: "new",
							due: addMinutes(new Date(), -1).toISOString(),
						} as Repetition,
						{
							state: "learning",
							due: addMinutes(new Date(), -10).toISOString(),
						} as Repetition,
					],
				} as Cell,
				fsrsProfileId: "",
			},
			{
				cell: {
					repetitions: [
						{
							state: "learning",
							due: addMinutes(new Date(), -2).toISOString(),
						} as Repetition,
					],
				} as Cell,
				fsrsProfileId: "",
			},
		];

		vi.mocked(getCellsForFilesWithFsrsProfileIds).mockResolvedValue(
			cellsWithFsrsProfileIds,
		);

		vi.mocked(getAllFsrsProfiles).mockResolvedValue([
			{
				id: "",
			} as FsrsProfile,
		]);

		// Act

		renderWithProviders(
			<Reviewer
				fileIds={[]}
				onEditButtonClick={vi.fn()}
				callApi={callApiMock}
			/>,
		);

		// Assert

		expect(await screen.findByTestId("new-count")).toHaveTextContent("2");
		expect(await screen.findByTestId("learning-count")).toHaveTextContent(
			"2",
		);
		expect(await screen.findByTestId("review-count")).toHaveTextContent(
			"0",
		);

		expect(
			(await screen.findByTestId("learning-count")).parentNode,
		).toHaveClass(styles.active);
	});

	it("Should use FSRF profile correctly when submitting and then navigate to home", async () => {
		// Arrange

		const repetition: Repetition = {
			id: "repetition-1",
			lastReview: new Date().toISOString(),
			reps: 8,
			scheduledDays: 4,
			stability: 2,
			state: "new",
			due: addMinutes(new Date(), -1).toISOString(),
			cellId: "cell-1",
			fileId: "file-1",
			difficulty: 4,
			elapsedDays: 8,
			lapses: 8,
			additionalContent: "",
		};

		const cellsWithFsrsProfileIds: CellWithFsrsProfileIdDto[] = [
			{
				cell: {
					id: "cell-1",
					repetitions: [repetition],
				} as Cell,
				fsrsProfileId: "123",
			},
		];

		vi.mocked(getCellsForFilesWithFsrsProfileIds).mockResolvedValue(
			cellsWithFsrsProfileIds,
		);

		const fsrsProfile: FsrsProfile = {
			id: "123",
			name: "",
			requestRetention: 0.1,
			maximumInterval: 100,
			weights: [
				1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.1, 1, 1, 1.1, 1, 1, 1, 1, 1,
				1,
			],
		};

		vi.mocked(getAllFsrsProfiles).mockResolvedValue([fsrsProfile]);

		renderWithProviders(
			<Reviewer
				fileIds={[]}
				onEditButtonClick={vi.fn()}
				callApi={callApiMock}
			/>,
		);

		// Act

		await userEvent.click(await screen.findByText("Show Answer"));
		await userEvent.click(await screen.findByText("Good"));

		// Assert

		const params = generatorParameters({
			w: fsrsProfile.weights,
			maximum_interval: fsrsProfile.maximumInterval,
			request_retention: fsrsProfile.requestRetention,
		});
		const fsrs = new FSRS(params);
		const recordLog = fsrs.repeat(
			createCardFromRepetition(repetition),
			new Date(),
		);

		const newRepetition = createRepetitionFromCard(
			recordLog["3"].card,
			"repetition-1",
			"file-1",
			"cell-1",
			"",
		);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { due, lastReview, ...newRepetitionCompare } = newRepetition;

		expect(vi.mocked(registerReview)).toHaveBeenCalledWith(
			expect.objectContaining(newRepetitionCompare),
			"Good",
			expect.anything(),
		);

		expect(await getCurrentLocation()).toBe("/home");
	});
});
