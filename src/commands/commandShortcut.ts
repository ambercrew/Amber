import { CommandId, commandsById } from "./commands";
import { formatShortcut } from "./formatShortcut";

/** The formatted shortcut declared for a command, if any, reused wherever it's displayed (spotlight, context menus). */
export function commandShortcut(id: CommandId): string | undefined {
	const shortcut = commandsById[id].shortcut;
	return shortcut && formatShortcut(shortcut);
}
