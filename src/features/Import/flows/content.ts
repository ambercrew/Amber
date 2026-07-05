import { normalize } from "../normalize";
import { deriveTitle } from "../deriveTitle";
import { createImportedReading } from "../createImportedReading";
import { ImportContext } from "../importContext";

export interface PastedContent {
	html: string | null;
	text: string;
}

export async function runContentImport(
	input: PastedContent,
	ctx: ImportContext,
): Promise<void> {
	const html = input.html ?? textToParagraphs(input.text);
	const content = await normalize(html, { baseUrl: null });
	const title = deriveTitle(content, input.text);

	await createImportedReading(ctx, title, content);
}

function textToParagraphs(text: string): string {
	return text
		.split(/\n{2,}/)
		.map(paragraph => `<p>${escapeHtml(paragraph.trim())}</p>`)
		.join("");
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}
