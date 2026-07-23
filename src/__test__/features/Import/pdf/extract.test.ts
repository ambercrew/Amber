import { extractPdf } from "../../../../features/Import/pdf/extract";
import { extractPdf as invokeExtractPdf } from "../../../../api/import/api/importApi";

vi.mock(import("../../../../api/import/api/importApi"));

describe("extractPdf", () => {
	it("Should base64-encode the bytes before invoking the backend", async () => {
		// Arrange

		const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer;
		vi.mocked(invokeExtractPdf).mockResolvedValue({
			title: "T",
			authors: null,
			publicationDate: null,
			html: "<p>h</p>",
			pageCount: 1,
		});

		// Act

		await extractPdf(bytes);

		// Assert

		expect(invokeExtractPdf).toHaveBeenCalledWith("JVBERg==", undefined);
	});

	it("Should resolve with the backend result", async () => {
		// Arrange

		const bytes = new ArrayBuffer(4);
		vi.mocked(invokeExtractPdf).mockResolvedValue({
			title: "Title",
			authors: "Jane Doe",
			publicationDate: "2020-01-01",
			html: "<p>content</p>",
			pageCount: 3,
		});

		// Act

		const actual = await extractPdf(bytes);

		// Assert

		expect(actual).toEqual({
			title: "Title",
			authors: "Jane Doe",
			publicationDate: "2020-01-01",
			html: "<p>content</p>",
			pageCount: 3,
		});
	});

	it("Should forward the onProgress callback to the backend call", async () => {
		// Arrange

		const bytes = new ArrayBuffer(4);
		const onProgress = vi.fn();
		vi.mocked(invokeExtractPdf).mockResolvedValue({
			title: null,
			authors: null,
			publicationDate: null,
			html: "<p>ok</p>",
			pageCount: 2,
		});

		// Act

		await extractPdf(bytes, onProgress);

		// Assert

		expect(invokeExtractPdf).toHaveBeenCalledWith(
			expect.any(String),
			onProgress,
		);
	});

	it("Should reject when the backend call rejects", async () => {
		// Arrange

		const bytes = new ArrayBuffer(4);
		vi.mocked(invokeExtractPdf).mockRejectedValue(
			new Error("no-text-layer"),
		);

		// Act & Assert

		await expect(extractPdf(bytes)).rejects.toThrow("no-text-layer");
	});
});
