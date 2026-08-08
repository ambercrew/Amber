import { createImportedReading } from "../../../features/Import/createImportedReading";
import { createReadingAction } from "../../../stores/elements/elementsActions";
import { ImportContext } from "../../../features/Import/importContext";

vi.mock(import("../../../stores/elements/elementsActions"));

describe("createImportedReading", () => {
	it("Should dispatch createReadingAction with a generated id, the name, parent, and content", async () => {
		// Arrange

		const thunk = Symbol("thunk");
		vi.mocked(createReadingAction).mockReturnValue(
			thunk as unknown as ReturnType<typeof createReadingAction>,
		);
		const dispatch = vi.fn().mockResolvedValue(undefined);
		const navigate = vi.fn().mockResolvedValue(undefined);
		const parent = {
			type: "folder",
			id: "parent-id",
		} as ImportContext["parent"];
		const ctx: ImportContext = {
			dispatch: dispatch as unknown as ImportContext["dispatch"],
			navigate: navigate as unknown as ImportContext["navigate"],
			parent,
		};

		// Act

		await createImportedReading(ctx, "My Title", "<p>content</p>");

		// Assert

		const dto = vi.mocked(createReadingAction).mock.calls[0][0];
		expect(typeof dto.id).toBe("string");
		expect(dto.meta).toEqual({ name: "My Title", parent });
		expect(dto.content).toBe("<p>content</p>");
		expect(dispatch).toHaveBeenCalledWith(thunk);
	});

	it("Should navigate to the newly created reading's path", async () => {
		// Arrange

		vi.mocked(createReadingAction).mockReturnValue(
			Symbol("thunk") as unknown as ReturnType<
				typeof createReadingAction
			>,
		);
		const dispatch = vi.fn().mockResolvedValue(undefined);
		const navigate = vi.fn().mockResolvedValue(undefined);
		const ctx: ImportContext = {
			dispatch: dispatch as unknown as ImportContext["dispatch"],
			navigate: navigate as unknown as ImportContext["navigate"],
			parent: null,
		};

		// Act

		await createImportedReading(ctx, "Title", "<p>content</p>");

		// Assert

		const dtoArg = vi.mocked(createReadingAction).mock.calls[0][0];
		expect(navigate).toHaveBeenCalledWith(`/reading/${dtoArg.id}`);
	});
});
