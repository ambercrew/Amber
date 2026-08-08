import { extractPdf, PdfProgress } from "../pdf/extract";
import { normalize } from "../normalize";
import { createImportedReading } from "../createImportedReading";
import { ImportContext } from "../importContext";

export type FileImportError =
	| { kind: "unsupported-file" }
	| { kind: "no-text-layer" }
	| { kind: "pdf-failed"; message: string };

const TITLE_SUFFIX_PATTERN = /\.(docx?|pdf|pptx?|xlsx?)$/i;

export async function runFileImport(
	files: File[],
	ctx: ImportContext,
	onProgress?: (progress: PdfProgress) => void,
): Promise<FileImportError | null> {
	for (const file of files) {
		const bytes = await file.arrayBuffer();
		if (!hasPdfMagic(bytes)) return { kind: "unsupported-file" };

		try {
			const extraction = await extractPdf(bytes, onProgress);
			const content = await normalize(extraction.html, { baseUrl: null });
			const title =
				plausibleTitle(extraction.title) ??
				file.name.replace(/\.pdf$/i, "");

			await createImportedReading(ctx, title, content);
		} catch (err) {
			if (err instanceof Error && err.message === "no-text-layer") {
				return { kind: "no-text-layer" };
			}
			return {
				kind: "pdf-failed",
				message: err instanceof Error ? err.message : String(err),
			};
		}
	}

	return null;
}

function hasPdfMagic(bytes: ArrayBuffer): boolean {
	const head = new Uint8Array(bytes.slice(0, 5));
	return String.fromCharCode(...head) === "%PDF-";
}

function plausibleTitle(title: string | null): string | null {
	if (!title) return null;
	const trimmed = title.trim();
	if (trimmed.length === 0) return null;
	if (/^untitled$/i.test(trimmed)) return null;
	if (TITLE_SUFFIX_PATTERN.test(trimmed)) return null;
	return trimmed;
}
