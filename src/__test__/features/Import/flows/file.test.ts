import { runFileImport } from "../../../../features/Import/flows/file";
import { extractPdf } from "../../../../features/Import/pdf/extract";
import { normalize } from "../../../../features/Import/normalize";
import { createImportedReading } from "../../../../features/Import/createImportedReading";
import { createSource } from "../../../../api/sources/api/sourcesApi";
import { SourceResponseDto } from "../../../../api/sources/dto/sourceDto";
import { ImportContext } from "../../../../features/Import/importContext";

vi.mock(import("../../../../features/Import/pdf/extract"));
vi.mock(import("../../../../features/Import/normalize"));
vi.mock(import("../../../../features/Import/createImportedReading"));
vi.mock(import("../../../../api/sources/api/sourcesApi"));

function makeSource(
	overrides: Partial<SourceResponseDto> = {},
): SourceResponseDto {
	return {
		id: "source-1",
		createdAt: "2024-01-01T00:00:00Z",
		modifiedAt: "2024-01-01T00:00:00Z",
		title: "PDF Title",
		authors: null,
		publicationDate: null,
		sourceType: "File",
		location: null,
		elementCount: 0,
		...overrides,
	};
}

function makeCtx(): ImportContext {
	return {
		dispatch: vi.fn() as unknown as ImportContext["dispatch"],
		navigate: vi.fn() as unknown as ImportContext["navigate"],
		parent: null,
	};
}

function pdfFile(name = "document.pdf"): File {
	const bytes = new TextEncoder().encode("%PDF-1.4 rest of file");
	return new File([bytes], name, { type: "application/pdf" });
}

function nonPdfFile(name = "document.txt"): File {
	return new File(["not a pdf"], name, { type: "text/plain" });
}

describe("runFileImport", () => {
	it("Should return unsupported-file when the file lacks the PDF magic bytes", async () => {
		// Arrange

		const ctx = makeCtx();

		// Act

		const actual = await runFileImport([nonPdfFile()], ctx);

		// Assert

		expect(actual).toEqual({ kind: "unsupported-file" });
		expect(extractPdf).not.toHaveBeenCalled();
	});

	it("Should extract, normalize, and create a reading for a valid pdf", async () => {
		// Arrange

		vi.mocked(extractPdf).mockResolvedValue({
			title: "PDF Title",
			authors: "Jane Doe",
			publicationDate: "2020-01-01",
			html: "<p>pdf content</p>",
			pageCount: 1,
		});
		vi.mocked(normalize).mockResolvedValue("<p>normalized</p>");
		const source = makeSource({ id: "source-1" });
		vi.mocked(createSource).mockResolvedValue(source);
		const ctx = makeCtx();

		// Act

		const actual = await runFileImport([pdfFile()], ctx);

		// Assert

		expect(actual).toBeNull();
		expect(normalize).toHaveBeenCalledWith("<p>pdf content</p>", {
			baseUrl: null,
		});
		expect(createSource).toHaveBeenCalledWith({
			title: "document.pdf",
			authors: "Jane Doe",
			publicationDate: "2020-01-01",
			sourceType: "File",
			location: "document.pdf",
		});
		expect(createImportedReading).toHaveBeenCalledWith(
			ctx,
			"PDF Title",
			"<p>normalized</p>",
			"source-1",
		);
	});

	it("Should fall back to the filename when the extracted title is not plausible", async () => {
		// Arrange

		vi.mocked(extractPdf).mockResolvedValue({
			title: "Untitled",
			authors: null,
			publicationDate: null,
			html: "<p>content</p>",
			pageCount: 1,
		});
		vi.mocked(normalize).mockResolvedValue("<p>content</p>");
		vi.mocked(createSource).mockResolvedValue(makeSource());
		const ctx = makeCtx();

		// Act

		await runFileImport([pdfFile("report.pdf")], ctx);

		// Assert

		expect(createImportedReading).toHaveBeenCalledWith(
			ctx,
			"report",
			"<p>content</p>",
			"source-1",
		);
	});

	it("Should fall back to the filename when the extracted title looks like a filename", async () => {
		// Arrange

		vi.mocked(extractPdf).mockResolvedValue({
			title: "report.docx",
			authors: null,
			publicationDate: null,
			html: "<p>content</p>",
			pageCount: 1,
		});
		vi.mocked(normalize).mockResolvedValue("<p>content</p>");
		vi.mocked(createSource).mockResolvedValue(makeSource());
		const ctx = makeCtx();

		// Act

		await runFileImport([pdfFile("myfile.pdf")], ctx);

		// Assert

		expect(createImportedReading).toHaveBeenCalledWith(
			ctx,
			"myfile",
			"<p>content</p>",
			"source-1",
		);
	});

	it("Should return no-text-layer when extraction throws that specific error", async () => {
		// Arrange

		vi.mocked(extractPdf).mockRejectedValue(new Error("no-text-layer"));
		const ctx = makeCtx();

		// Act

		const actual = await runFileImport([pdfFile()], ctx);

		// Assert

		expect(actual).toEqual({ kind: "no-text-layer" });
	});

	it("Should return pdf-failed with the error message when extraction throws any other error", async () => {
		// Arrange

		vi.mocked(extractPdf).mockRejectedValue(new Error("corrupt file"));
		const ctx = makeCtx();

		// Act

		const actual = await runFileImport([pdfFile()], ctx);

		// Assert

		expect(actual).toEqual({ kind: "pdf-failed", message: "corrupt file" });
	});

	it("Should report progress via the onProgress callback", async () => {
		// Arrange

		vi.mocked(extractPdf).mockImplementation((_bytes, onProgress) => {
			onProgress?.({ done: 1, total: 2 });
			return Promise.resolve({
				title: "T",
				authors: null,
				publicationDate: null,
				html: "<p>c</p>",
				pageCount: 2,
			});
		});
		vi.mocked(normalize).mockResolvedValue("<p>c</p>");
		vi.mocked(createSource).mockResolvedValue(makeSource());
		const onProgress = vi.fn();
		const ctx = makeCtx();

		// Act

		await runFileImport([pdfFile()], ctx, onProgress);

		// Assert

		expect(onProgress).toHaveBeenCalledWith({ done: 1, total: 2 });
	});
});
