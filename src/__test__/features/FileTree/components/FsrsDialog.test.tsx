import userEvent from "@testing-library/user-event";
import {
	createProfile,
	deleteFsrsProfile,
	getAllFsrsProfiles,
	getFolderFsrsProfile,
	getFsrsProfileChoiceForFolder,
	setFsrsProfileChoiceForFolder,
	updateProfile,
} from "../../../../api/fsrs/api/fsrsApi.ts";
import FsrsDialog from "../../../../features/FileTree/components/FsrsDialog.tsx";
import FsrsProfile from "../../../../api/fsrs/entities/fsrsProfile.ts";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.tsx";
import { screen } from "@testing-library/react";
import { FsrsProfileChoice } from "../../../../api/fileSystem/valueObjects/fsrsProfileChoice.ts";

vi.mock(import("../../../../api/fsrs/api/fsrsApi.ts"));
vi.mock(import("../../../../utils/tauriUtils.ts"), () => ({
	isAndroid: vi.fn(() => true),
}));

describe("FsrsDialog", () => {
	const ITEM_ID = "test_item";
	const FILLED_PROFILE: FsrsProfile = {
		id: "test",
		name: "testing",
		requestRetention: 4,
		maximumInterval: 20,
		weights: [
			0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
			1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
			1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
		],
	};

	it("Should be able to update profile", async () => {
		// Arrange

		vi.mocked(getAllFsrsProfiles).mockResolvedValue([FILLED_PROFILE]);

		vi.mocked(getFsrsProfileChoiceForFolder).mockResolvedValue({
			type: "id",
			content: FILLED_PROFILE.id,
		});

		vi.mocked(getFolderFsrsProfile).mockResolvedValue(FILLED_PROFILE);

		const onCloseMock = vi.fn();

		renderWithProviders(
			<FsrsDialog
				id={ITEM_ID}
				isFolder={true}
				onClose={onCloseMock}
				name=""
			/>,
		);

		// Act

		await userEvent.click(await screen.findByText("Name"));
		await userEvent.keyboard("{backspace>100}new name");

		await userEvent.click(screen.getByText("Request retention"));
		await userEvent.keyboard("{ArrowRight>100}{backspace>100}8");

		await userEvent.click(screen.getByText("Maximum interval"));
		await userEvent.keyboard("{ArrowRight>100}{backspace>100}24");

		await userEvent.click(screen.getByText("Weights"));
		await userEvent.keyboard("1");

		await userEvent.click(screen.getByText("Save"));

		// Assert

		const expectedWeights = [...FILLED_PROFILE.weights];
		expectedWeights[expectedWeights.length - 1] = Number(
			expectedWeights[expectedWeights.length - 1].toString() + "1",
		);

		expect(vi.mocked(updateProfile)).toHaveBeenCalledWith({
			id: FILLED_PROFILE.id,
			name: "new name",
			requestRetention: 8,
			maximumInterval: 24,
			weights: expectedWeights,
		} as FsrsProfile);

		expect(onCloseMock).toHaveBeenCalled();
	});

	it("Should be able to change chosen profile", async () => {
		// Arrange

		vi.mocked(getAllFsrsProfiles).mockResolvedValue([
			FILLED_PROFILE,
			{ ...FILLED_PROFILE, name: "profile-2", id: "profile-2" },
		]);

		vi.mocked(getFsrsProfileChoiceForFolder).mockResolvedValue({
			type: "id",
			content: FILLED_PROFILE.id,
		});

		vi.mocked(getFolderFsrsProfile).mockResolvedValue(FILLED_PROFILE);

		const onCloseMock = vi.fn();

		renderWithProviders(
			<FsrsDialog
				id={ITEM_ID}
				isFolder={true}
				onClose={onCloseMock}
				name=""
			/>,
		);

		// Act

		await userEvent.click(await screen.findByText(FILLED_PROFILE.name));
		await userEvent.click(await screen.findByText("profile-2"));
		await userEvent.click(await screen.findByText("Save"));

		// Assert

		expect(vi.mocked(setFsrsProfileChoiceForFolder)).toHaveBeenCalledWith(
			ITEM_ID,
			{
				type: "id",
				content: "profile-2",
			} as FsrsProfileChoice,
		);
	});

	it("Should be able to clone profile then update it", async () => {
		// Arrange

		const clonedProfile = { ...FILLED_PROFILE, id: "profile-2" };
		vi.mocked(getAllFsrsProfiles)
			.mockResolvedValueOnce([FILLED_PROFILE])
			.mockResolvedValueOnce([FILLED_PROFILE, clonedProfile]);

		vi.mocked(createProfile).mockResolvedValue(clonedProfile);

		vi.mocked(getFsrsProfileChoiceForFolder).mockResolvedValue({
			type: "id",
			content: FILLED_PROFILE.id,
		});

		vi.mocked(getFolderFsrsProfile).mockResolvedValue(FILLED_PROFILE);

		renderWithProviders(
			<FsrsDialog
				id={ITEM_ID}
				isFolder={true}
				onClose={vi.fn()}
				name=""
			/>,
		);

		// Act

		await userEvent.click(await screen.findByTitle("Clone profile"));
		await userEvent.click(await screen.findByText("Request retention"));
		await userEvent.keyboard("{ArrowRight>100}{backspace>100}18");
		await userEvent.click(await screen.findByText("Save"));

		// Assert

		expect(vi.mocked(createProfile)).toHaveBeenCalledWith({
			name: FILLED_PROFILE.name + " clone",
			maximumInterval: FILLED_PROFILE.maximumInterval,
			requestRetention: FILLED_PROFILE.requestRetention,
			weights: FILLED_PROFILE.weights,
		});

		expect(vi.mocked(setFsrsProfileChoiceForFolder)).toHaveBeenCalledWith(
			ITEM_ID,
			{
				type: "id",
				content: "profile-2",
			} as FsrsProfileChoice,
		);

		expect(vi.mocked(updateProfile)).toHaveBeenCalledWith(
			expect.objectContaining({
				id: clonedProfile.id,
				requestRetention: 18,
			} as FsrsProfile),
		);
	});

	it("Should be able to delete a profile then updating the current selected profile", async () => {
		// Arrange

		const selectedProfile = { ...FILLED_PROFILE, id: "profile-2" };
		vi.mocked(getAllFsrsProfiles)
			.mockResolvedValueOnce([FILLED_PROFILE, selectedProfile])
			.mockResolvedValue([FILLED_PROFILE]);

		vi.mocked(getFsrsProfileChoiceForFolder)
			.mockResolvedValueOnce({
				type: "id",
				content: selectedProfile.id,
			})
			.mockResolvedValueOnce({
				type: "id",
				content: FILLED_PROFILE.id,
			});

		vi.mocked(getFolderFsrsProfile)
			.mockResolvedValueOnce(selectedProfile)
			.mockResolvedValueOnce(FILLED_PROFILE);

		renderWithProviders(
			<FsrsDialog
				id={ITEM_ID}
				isFolder={true}
				onClose={vi.fn()}
				name=""
			/>,
		);

		// Act

		await userEvent.click(await screen.findByTitle("Delete profile"));
		await userEvent.click(await screen.findByText("Yes"));
		await userEvent.click(await screen.findByText("Request retention"));
		await userEvent.keyboard("{ArrowRight>100}{backspace>100}18");
		await userEvent.click(await screen.findByText("Save"));

		// Assert

		expect(vi.mocked(deleteFsrsProfile)).toHaveBeenCalledWith(
			selectedProfile.id,
		);

		expect(vi.mocked(setFsrsProfileChoiceForFolder)).toHaveBeenCalledWith(
			ITEM_ID,
			{
				type: "id",
				content: FILLED_PROFILE.id,
			} as FsrsProfileChoice,
		);

		expect(vi.mocked(updateProfile)).toHaveBeenCalledWith(
			expect.objectContaining({
				id: FILLED_PROFILE.id,
				requestRetention: 18,
			} as FsrsProfile),
		);
	});
});
