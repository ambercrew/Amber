import { CommandId, commands } from "./commands";
import { formatShortcut } from "./formatShortcut";

/** The formatted shortcut declared for a command, if any, reused wherever it's displayed (spotlight, context menus). */
export function commandShortcut(id: CommandId): string | undefined {
	const shortcut = commands.find(c => c.id === id)?.shortcut;
	return shortcut && formatShortcut(shortcut);
}
