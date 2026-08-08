export function defaultElementName(label: string): string {
	const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
	return `${label} ${timestamp}`;
}
