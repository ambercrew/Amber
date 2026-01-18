import styles from "../../../../features/Reviewer/components/styles.module.css";
import { screen } from "@testing-library/react";
import { getCellsForFilesWithFsrsProfileIds } from "../../../../api/cellApi.ts";
import Reviewer from "../../../../features/Reviewer/components/Reviewer.tsx";
import { CellWithFsrsProfileId } from "../../../../types/backend/dto/cellWithFsrsProfileId.ts";
import Cell from "../../../../types/backend/entity/cell";
import Repetition from "../../../../types/backend/entity/repetition.ts";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.tsx";
import { getAllFsrsProfiles } from "../../../../api/fsrsApi";
import FsrsProfile from "../../../../types/backend/entity/fsrsProfile.ts";
import userEvent from "@testing-library/user-event";
import { registerReview } from "../../../../api/reviewApi.ts";
import { FSRS, generatorParameters } from "ts-fsrs";
import createCardFromRepetition from "../../../../features/Reviewer/utils/createCardFromRepetition.ts";
import createRepetitionFromCard from "../../../../features/Reviewer/utils/createRepetitionFromCard.ts";

vi.mock(import("../../../../api/fsrsApi.ts"));
vi.mock(import("../../../../api/cellApi.ts"));
vi.mock(import("../../../../api/reviewApi.ts"));

function addMinutes(date: Date, minutes: number) {
	date.setMinutes(date.getMinutes() + minutes);
	return date;
}

describe("Reviewer", () => {
	it("Should show counts correctly and sorts correctly", async () => {
		// Arrange

		const cellsWithFsrsProfileIds: CellWithFsrsProfileId[] = [
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

		vi.mocked(getCellsForFilesWithFsrsProfileIds).mockReturnValue(
			Promise.resolve(cellsWithFsrsProfileIds),
		);

		vi.mocked(getAllFsrsProfiles).mockReturnValue(
			Promise.resolve([
				{
					id: "",
				} as FsrsProfile,
			]),
		);

		// Act

		renderWithProviders(
			<Reviewer
				fileIds={[]}
				onEditButtonClick={vi.fn()}
				onError={vi.fn()}
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

		expect(await screen.findByTestId("learning-count")).toHaveClass(
			styles.underline,
		);
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

		const cellsWithFsrsProfileIds: CellWithFsrsProfileId[] = [
			{
				cell: {
					id: "cell-1",
					repetitions: [repetition],
				} as Cell,
				fsrsProfileId: "123",
			},
		];

		vi.mocked(getCellsForFilesWithFsrsProfileIds).mockReturnValue(
			Promise.resolve(cellsWithFsrsProfileIds),
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

		vi.mocked(getAllFsrsProfiles).mockReturnValue(
			Promise.resolve([fsrsProfile]),
		);

		renderWithProviders(
			<Reviewer
				fileIds={[]}
				onEditButtonClick={vi.fn()}
				onError={vi.fn()}
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

		expect(vi.mocked(registerReview)).toBeCalledWith(
			expect.objectContaining(newRepetitionCompare),
			"Good",
			expect.anything(),
		);

		expect(screen.getByTestId("location-display")).toHaveTextContent(
			"/home",
		);
	});
});
