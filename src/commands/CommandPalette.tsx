import { Spotlight } from "@mantine/spotlight";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import GlobalHotkeys from "./GlobalHotkeys";
import { useSpotlightActions } from "./useSpotlightActions";
import { SPOTLIGHT_SHORTCUT } from "./commands";

function CommandPalette() {
	const actions = useSpotlightActions();

	return (
		<>
			<GlobalHotkeys />
			<Spotlight
				actions={actions}
				shortcut={SPOTLIGHT_SHORTCUT}
				nothingFound="No matching commands"
				searchProps={{
					leftSection: <MagnifyingGlassIcon size={18} />,
					placeholder: "Search commands...",
				}}
			/>
		</>
	);
}

export default CommandPalette;
