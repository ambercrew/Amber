export function isModKey(event: KeyboardEvent | React.KeyboardEvent): boolean {
	return event.ctrlKey || event.metaKey;
}
