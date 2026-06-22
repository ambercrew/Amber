export function isModKey(event: KeyboardEvent | React.KeyboardEvent): boolean {
	return event.ctrlKey || event.metaKey;
}

export function getModKeyLabel(): string {
	return navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";
}
