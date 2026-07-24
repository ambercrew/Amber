import { Menu } from "@mantine/core";
import { CommandMenuItem } from "../../../commands/CommandMenuItem";
import { commandIcon } from "../../../commands/commandIcon";

/** Submenu of read point actions, shown in the editor's right-click menu for a reading. */
export default function ReadPointMenu() {
	return (
		<Menu.Sub>
			<Menu.Sub.Target>
				<Menu.Sub.Item leftSection={commandIcon("set-read-point")}>
					Read point
				</Menu.Sub.Item>
			</Menu.Sub.Target>
			<Menu.Dropdown>
				<CommandMenuItem id="set-read-point">
					Set read point
				</CommandMenuItem>
				<CommandMenuItem id="clear-read-point">
					Clear read point
				</CommandMenuItem>
				<CommandMenuItem id="go-to-read-point">
					Go to read point
				</CommandMenuItem>
			</Menu.Dropdown>
		</Menu.Sub>
	);
}
