import { CommandId, commandsById } from "./commands";

/** The icon declared for a command, reused wherever it's invoked from (spotlight, context menus) so an icon choice lives in one place. */
export function commandIcon(id: CommandId) {
	return commandsById[id].icon;
}
