import { Drawer, DrawerProps } from "@mantine/core";
import { useCallback, useEffect, useRef } from "react";
import useBackButtonPress from "../../hooks/useBackButtonPress";
import { safeAreaTopStyle } from "../../utils/safeArea";

/** `styles` is owned by this component, which uses it for the safe area. */
export type AppDrawerProps = Omit<DrawerProps, "styles">;

/**
 * Mantine's `Drawer` with the app's defaults: padded so its header clears the
 * status bar on mobile and closed by Android's back button.
 */
function AppDrawer({
	closeButtonProps,
	closeOnEscape = true,
	opened,
	onClose,
	...others
}: AppDrawerProps) {
	const onCloseRef = useRef(onClose);

	useEffect(() => {
		onCloseRef.current = onClose;
	});

	// Kept stable so the listener is registered once per open, not per render.
	const handleBackButtonPress = useCallback(() => onCloseRef.current(), []);

	// An open drawer takes the back button so it dismisses the drawer rather
	// than navigating. Drawers that refuse escape refuse back too.
	useBackButtonPress(handleBackButtonPress, opened && closeOnEscape);

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
