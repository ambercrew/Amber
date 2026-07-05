import { useHotkeys } from "@mantine/hooks";
import { commands } from "./commands";
import { useRunCommand } from "./useRunCommand";

function GlobalHotkeys() {
	const run = useRunCommand();

	useHotkeys(
		commands
			.filter(c => c.shortcut)
			.map(c => [c.shortcut!, () => run(c.id)] as [string, () => void]),
		[],
		true,
	);

	return null;
}

export default GlobalHotkeys;
