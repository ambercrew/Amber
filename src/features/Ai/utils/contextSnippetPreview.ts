const PREVIEW_LENGTH = 30;

export function previewText(text: string) {
	const trimmed = text.trim();
	return trimmed.length > PREVIEW_LENGTH
		? `${trimmed.slice(0, PREVIEW_LENGTH)}…`
		: trimmed;
}
