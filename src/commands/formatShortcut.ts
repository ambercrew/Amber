const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

const KEY_SYMBOLS: Record<string, string> = isMac
	? { mod: "⌘", ctrl: "⌃", alt: "⌥", shift: "⇧" }
	: { mod: "Ctrl", ctrl: "Ctrl", alt: "Alt", shift: "Shift" };

const SPECIAL: Record<string, string> = {
	arrowup: "↑",
	arrowdown: "↓",
	arrowleft: "←",
	arrowright: "→",
	enter: "↵",
	backspace: "⌫",
	escape: "Esc",
	space: "Space",
};

export function formatShortcut(shortcut: string): string {
	const parts = shortcut.split("+").map(p => {
		const key = p.trim().toLowerCase();
		return KEY_SYMBOLS[key] ?? SPECIAL[key] ?? key.toUpperCase();
	});
	return isMac ? parts.join("") : parts.join(" + ");
}
