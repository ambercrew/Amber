import { Readability } from "@mozilla/readability";
import { fetchPage } from "../../../api/import/api/importApi";
import errorToString from "../../../utils/errorToString";
import { normalize } from "../normalize";
import { hydrateLazyImages } from "../normalize/hydrateLazyImages";
import { deriveTitle } from "../deriveTitle";
import { createImportedReading } from "../createImportedReading";
import { ImportContext } from "../importContext";
import { runFileImport, FileImportError } from "./file";

export type UrlImportError =
	| { kind: "fetch-failed"; message: string }
	| { kind: "no-article"; rawHtml: string; sourceUrl: string }
	| FileImportError;

export async function runUrlImport(
	url: string,
	ctx: ImportContext,
): Promise<UrlImportError | null> {
	let page;
	try {
		page = await fetchPage(url);
	} catch (err) {
		return { kind: "fetch-failed", message: errorToString(err) };
	}

	if (page.kind === "pdf") {
		const bytes = base64ToArrayBuffer(page.bytesBase64);
		const file = new File([bytes], filenameFromUrl(page.finalUrl), {
			type: "application/pdf",
		});
		return runFileImport([file], ctx);
	}

	if (page.kind === "other") {
		return {
			kind: "fetch-failed",
			message: "This link isn't an article or PDF.",
		};
	}

	const doc = new DOMParser().parseFromString(page.text, "text/html");
	const base = doc.createElement("base");
	base.href = page.finalUrl;
	doc.head.prepend(base);

	// The fetched HTML is server-rendered, so lazy-loaded images still hold
	// their real URL in a data-* attribute. Promote it to src before
	// Readability runs, otherwise Readability drops images with no src.
	hydrateLazyImages(doc);

	const article = new Readability(doc).parse();
	if (!article) {
		return {
			kind: "no-article",
			rawHtml: doc.body.innerHTML,
			sourceUrl: page.finalUrl,
		};
	}

	await importArticleHtml(
		article.content ?? "",
		article.title ?? null,
		page.finalUrl,
		ctx,
	);
	return null;
}

export async function importRawPage(
	rawHtml: string,
	sourceUrl: string,
	ctx: ImportContext,
): Promise<void> {
	await importArticleHtml(rawHtml, null, sourceUrl, ctx);
}

async function importArticleHtml(
	html: string,
	title: string | null,
	baseUrl: string,
	ctx: ImportContext,
): Promise<void> {
	const content = await normalize(html, { baseUrl });
	const trimmedTitle = title?.trim();
	const finalTitle =
		trimmedTitle && trimmedTitle.length > 0
			? trimmedTitle
			: deriveTitle(content, "");
	await createImportedReading(ctx, finalTitle, content);
}

function filenameFromUrl(url: string): string {
	const last = url.split("/").filter(Boolean).pop() ?? "document.pdf";
	return last.toLowerCase().endsWith(".pdf") ? last : `${last}.pdf`;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes.buffer;
}
