import { Modal, ModalProps } from "@mantine/core";
import { useIsSmallScreen } from "../../hooks/useIsSmallScreen";
import { safeAreaTopStyle } from "../../utils/safeArea";

/** `styles` is owned by this component, which uses it for the safe area. */
export type AppModalProps = Omit<ModalProps, "styles">;

/**
 * Mantine's `Modal` with the app's defaults: centered, full screen once the
 * viewport is too small for a dialog, and — while full screen — padded so its
 * header clears the status bar on mobile.
 */
function AppModal({
	fullScreen,
	centered = true,
	closeButtonProps,
	...others
}: AppModalProps) {
	const isSmallScreen = useIsSmallScreen();
	const isFullScreen = fullScreen ?? isSmallScreen;

	return (
		<Modal
			fullScreen={isFullScreen}
			centered={centered}
			closeButtonProps={{ "aria-label": "Close", ...closeButtonProps }}
			styles={{ content: isFullScreen ? safeAreaTopStyle() : undefined }}
			{...others}
		/>
	);
}

export default AppModal;
