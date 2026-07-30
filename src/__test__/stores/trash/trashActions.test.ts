import { getElementTree } from "../../../api/elements/api/elementsApi";
import {
	deleteElementPermanently,
	emptyTrash,
	getTrash,
	restoreElement,
	trashElement,
} from "../../../api/trash/api/trashApi";
import { TrashedElementDto } from "../../../api/trash/dto/trashedElementDto";
import { clearSplitHeights } from "../../../features/ElementViewer/ReadingView/heights/splitHeightsStorage";
import { setTree } from "../../../stores/elements/elementsReducer";
import {
	deleteElementPermanentlyAction,
	emptyTrashAction,
	restoreElementAction,
	trashElementAction,
} from "../../../stores/trash/trashActions";
import {
	setTrash,
	setTrashError,
	setTrashLoading,
} from "../../../stores/trash/trashReducer";

vi.mock(import("../../../api/trash/api/trashApi"));
vi.mock(import("../../../api/elements/api/elementsApi"));
vi.mock(
	import("../../../features/ElementViewer/ReadingView/heights/splitHeightsStorage"),
);

const TRASHED_READING: TrashedElementDto = {
	elementId: { type: "reading", id: "reading-1" },
	name: "Photosynthesis",
	trashedAt: "2026-07-01T00:00:00Z",
	descendantCount: 0,
};

describe("trashActions", () => {
	beforeEach(() => {
		vi.mocked(getElementTree).mockResolvedValue([]);
		vi.mocked(getTrash).mockResolvedValue([TRASHED_READING]);
	});

	it("Should reload both the tree and the trash when an element is trashed", async () => {
		// Arrange

		const dispatch = vi.fn();
		const elementId = { type: "folder", id: "folder-1" } as const;

		// Act

		await trashElementAction(elementId)(dispatch);

		// Assert

		expect(trashElement).toHaveBeenCalledWith(elementId);
		expect(dispatch).toHaveBeenNthCalledWith(1, setTrashLoading());
		expect(dispatch).toHaveBeenCalledWith(setTree([]));
		expect(dispatch).toHaveBeenCalledWith(setTrash([TRASHED_READING]));
	});

	it("Should reload both the tree and the trash when an element is restored", async () => {
		// Arrange

		const dispatch = vi.fn();
		const elementId = { type: "folder", id: "folder-1" } as const;

		// Act

		await restoreElementAction(elementId)(dispatch);

		// Assert

		expect(restoreElement).toHaveBeenCalledWith(elementId);
		expect(dispatch).toHaveBeenCalledWith(setTree([]));
		expect(dispatch).toHaveBeenCalledWith(setTrash([TRASHED_READING]));
	});

	it("Should clear the cached split heights when a reading is deleted permanently", async () => {
		// Arrange

		const dispatch = vi.fn();

		// Act

		await deleteElementPermanentlyAction(TRASHED_READING.elementId)(
			dispatch,
		);

		// Assert

		expect(deleteElementPermanently).toHaveBeenCalledWith(
			TRASHED_READING.elementId,
		);
		expect(clearSplitHeights).toHaveBeenCalledWith("reading-1");
	});

	it("Should clear the cached split heights of every trashed reading when the trash is emptied", async () => {
		// Arrange

		const dispatch = vi.fn();

		// Act

		await emptyTrashAction([
			TRASHED_READING,
			{
				elementId: { type: "folder", id: "folder-1" },
				name: "Science",
				trashedAt: "2026-07-01T00:00:00Z",
				descendantCount: 0,
			},
		])(dispatch);

		// Assert

		expect(emptyTrash).toHaveBeenCalled();
		expect(clearSplitHeights).toHaveBeenCalledExactlyOnceWith("reading-1");
	});

	it("Should dispatch the error when the trash operation fails", async () => {
		// Arrange

		const dispatch = vi.fn();
		vi.mocked(trashElement).mockRejectedValue(new Error("nope"));

		// Act

		await trashElementAction({ type: "folder", id: "folder-1" })(dispatch);

		// Assert

		expect(dispatch).toHaveBeenCalledWith(setTrashError("nope"));
	});
});
