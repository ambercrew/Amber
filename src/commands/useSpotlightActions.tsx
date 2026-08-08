import { useCallback, useState } from "react";
import { Kbd } from "@mantine/core";
import type { SpotlightActionGroupData } from "@mantine/spotlight";
import { useStore } from "react-redux";
import { RootState } from "../stores/store";
import { commandGroups, commands } from "./commands";
import { formatShortcut } from "./formatShortcut";
import { useRunCommand } from "./useRunCommand";

function buildActionGroups(
	state: RootState,
	run: (id: (typeof commands)[number]["id"]) => void,
): SpotlightActionGroupData[] {
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
}

export function useSpotlightActions() {
	const store = useStore<RootState>();
	const run = useRunCommand();
	const [actions, setActions] = useState<SpotlightActionGroupData[]>(() =>
		buildActionGroups(store.getState(), run),
	);

	const refresh = useCallback(
		() => setActions(buildActionGroups(store.getState(), run)),
		[store, run],
	);

	return { actions, refresh };
}
