import { useMemo } from "react";
import { Kbd } from "@mantine/core";
import type { SpotlightActionGroupData } from "@mantine/spotlight";
import useAppSelector from "../hooks/useAppSelector";
import { RootState } from "../stores/store";
import { commandGroups, commands } from "./commands";
import { formatShortcut } from "./formatShortcut";
import { useRunCommand } from "./useRunCommand";

export function useSpotlightActions(): SpotlightActionGroupData[] {
	const state = useAppSelector((s: RootState) => s);
	const run = useRunCommand();

	return useMemo(() => {
		const visible = commands.filter(c => !c.enabled || c.enabled(state));

		return commandGroups
			.map(group => ({
				group,
				actions: visible
					.filter(c => c.group === group)
					.map(c => ({
						id: c.id,
						label:
							typeof c.label === "function"
								? c.label(state)
								: c.label,
						leftSection: c.icon,
						rightSection: c.shortcut && (
							<Kbd>{formatShortcut(c.shortcut)}</Kbd>
						),
						onClick: () => run(c.id),
					})),
			}))
			.filter(g => g.actions.length > 0);
	}, [state, run]);
}
