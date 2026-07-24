import { Menu } from "@mantine/core";
import { commandIcon } from "../../../commands/commandIcon";
import { useRunCommand } from "../../../commands/useRunCommand";

/** Submenu of read point actions, shown in the editor's right-click menu for a reading. */
export default function ReadPointMenu() {
	const runCommand = useRunCommand();

	return (
		<Menu.Sub>
			<Menu.Sub.Target>
				<Menu.Sub.Item leftSection={commandIcon("set-read-point")}>
					Read point
				</Menu.Sub.Item>
			</Menu.Sub.Target>
			<Menu.Dropdown>
				<Menu.Item
					leftSection={commandIcon("set-read-point")}
					onClick={() => runCommand("set-read-point")}>
					Set read point
				</Menu.Item>
				<Menu.Item
					leftSection={commandIcon("clear-read-point")}
					onClick={() => runCommand("clear-read-point")}>
					Clear read point
				</Menu.Item>
				<Menu.Item
					leftSection={commandIcon("go-to-read-point")}
					onClick={() => runCommand("go-to-read-point")}>
					Go to read point
				</Menu.Item>
			</Menu.Dropdown>
		</Menu.Sub>
	);
}
