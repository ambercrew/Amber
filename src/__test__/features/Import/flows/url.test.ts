import {
	importRawPage,
	runUrlImport,
} from "../../../../features/Import/flows/url";
import { fetchPage } from "../../../../api/import/api/importApi";
import { normalize } from "../../../../features/Import/normalize";
import { hydrateLazyImages } from "../../../../features/Import/normalize/hydrateLazyImages";
import { createImportedReading } from "../../../../features/Import/createImportedReading";
import { runFileImport } from "../../../../features/Import/flows/file";
import { ImportContext } from "../../../../features/Import/importContext";

vi.mock(import("../../../../api/import/api/importApi"));
vi.mock(import("../../../../features/Import/normalize"));
vi.mock(import("../../../../features/Import/normalize/hydrateLazyImages"));
vi.mock(import("../../../../features/Import/createImportedReading"));
vi.mock(import("../../../../features/Import/flows/file"));

function makeCtx(): ImportContext {
	return {
		dispatch: vi.fn() as unknown as ImportContext["dispatch"],
		navigate: vi.fn() as unknown as ImportContext["navigate"],
		parent: null,
	};
}

const ARTICLE_BODY_TEXT =
	"Enough body content to make Readability treat this as a real article instead of discarding it as noise. ".repeat(
		5,
	);
const ARTICLE_HTML = `<html><head><title>Article Title</title></head><body><article><h1>Article Title</h1><p>${ARTICLE_BODY_TEXT}</p></article></body></html>`;

describe("runUrlImport", () => {
	it("Should return fetch-failed when fetching the page throws", async () => {
		// Arrange

		vi.mocked(fetchPage).mockRejectedValue(new Error("network down"));
		const ctx = makeCtx();

		// Act

		const actual = await runUrlImport("https://example.com", ctx);

		// Assert

		expect(actual).toEqual({
			kind: "fetch-failed",
			message: "network down",
		});
	});

	it("Should return fetch-failed when the page is neither html, pdf, nor recognized content", async () => {
		// Arrange

		vi.mocked(fetchPage).mockResolvedValue({
			kind: "other",
			finalUrl: "https://example.com",
			contentType: "application/zip",
		});
		const ctx = makeCtx();

		// Act

		const actual = await runUrlImport("https://example.com", ctx);

		// Assert

		expect(actual).toEqual({
			kind: "fetch-failed",
			message: "This link isn't an article or PDF.",
		});
	});

	it("Should delegate to runFileImport when the fetched page is a pdf", async () => {
		// Arrange

		const base64 = btoa("%PDF-1.4 fake");
		vi.mocked(fetchPage).mockResolvedValue({
			kind: "pdf",
			finalUrl: "https://example.com/doc.pdf",
			bytesBase64: base64,
		});
		vi.mocked(runFileImport).mockResolvedValue(null);
		const ctx = makeCtx();

		// Act

		const actual = await runUrlImport("https://example.com/doc.pdf", ctx);

		// Assert

		expect(actual).toBeNull();
		expect(runFileImport).toHaveBeenCalledTimes(1);
		const [files, passedCtx] = vi.mocked(runFileImport).mock.calls[0];
		expect(files[0].name).toBe("doc.pdf");
		expect(passedCtx).toBe(ctx);
	});

	it("Should hydrate lazy images before parsing the article", async () => {
		// Arrange

		vi.mocked(fetchPage).mockResolvedValue({
			kind: "html",
			finalUrl: "https://example.com/article",
			text: ARTICLE_HTML,
		});
		vi.mocked(normalize).mockResolvedValue("<p>normalized</p>");
		const ctx = makeCtx();

		// Act

		await runUrlImport("https://example.com/article", ctx);

		// Assert

		expect(hydrateLazyImages).toHaveBeenCalledTimes(1);
	});

	it("Should return no-article with the raw html and source url when Readability finds no article", async () => {
		// Arrange

		vi.mocked(fetchPage).mockResolvedValue({
			kind: "html",
			finalUrl: "https://example.com/empty",
			text: "<html><body></body></html>",
		});
		const ctx = makeCtx();

		// Act

		const actual = await runUrlImport("https://example.com/empty", ctx);

		// Assert

		expect(actual).toEqual({
			kind: "no-article",
			rawHtml: "",
			sourceUrl: "https://example.com/empty",
		});
	});

	it("Should normalize the extracted article and create a reading on success", async () => {
		// Arrange

		vi.mocked(fetchPage).mockResolvedValue({
			kind: "html",
			finalUrl: "https://example.com/article",
			text: ARTICLE_HTML,
		});
		vi.mocked(normalize).mockResolvedValue("<p>normalized</p>");
		const ctx = makeCtx();

		// Act

		const actual = await runUrlImport("https://example.com/article", ctx);

		// Assert

		expect(actual).toBeNull();
		expect(normalize).toHaveBeenCalledWith(expect.any(String), {
			baseUrl: "https://example.com/article",
		});
		expect(createImportedReading).toHaveBeenCalledWith(
			ctx,
			"Article Title",
			"<p>normalized</p>",
		);
	});
});

describe("importRawPage", () => {
	it("Should normalize the raw html and create a reading with a derived title", async () => {
		// Arrange

		vi.mocked(normalize).mockResolvedValue(
			"<h1>Fallback Title</h1><p>body</p>",
		);
		const ctx = makeCtx();

		// Act

		await importRawPage("<div>raw</div>", "https://example.com/raw", ctx);

		// Assert

		expect(normalize).toHaveBeenCalledWith("<div>raw</div>", {
			baseUrl: "https://example.com/raw",
		});
		expect(createImportedReading).toHaveBeenCalledWith(
			ctx,
			"Fallback Title",
			"<h1>Fallback Title</h1><p>body</p>",
		);
	});
});
