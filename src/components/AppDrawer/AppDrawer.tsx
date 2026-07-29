import { Drawer, DrawerProps } from "@mantine/core";
import useBackButtonPress from "../../hooks/useBackButtonPress";
import { BackButtonPriority } from "../../managers/backButtonManager";
import { safeAreaTopStyle } from "../../utils/safeArea";

/** `styles` is owned by this component, which uses it for the safe area. */
export type AppDrawerProps = Omit<DrawerProps, "styles">;

/**
 * Mantine's `Drawer` with the app's defaults: padded so its header clears the
 * status bar on mobile and closed by Android's back button. A drawer outranks
 * the modal it may be opened from, so back closes the drawer first.
 */
function AppDrawer({
	closeButtonProps,
	closeOnEscape = true,
	opened,
	onClose,
	...others
}: AppDrawerProps) {
	useBackButtonPress(
		onClose,
		opened && closeOnEscape,
		BackButtonPriority.High,
	);

	return (
		<Drawer
			opened={opened}
			onClose={onClose}
			closeOnEscape={closeOnEscape}
			closeButtonProps={{ "aria-label": "Close", ...closeButtonProps }}
			styles={{ content: safeAreaTopStyle() }}
			{...others}
		/>
	);
}

export default AppDrawer;
