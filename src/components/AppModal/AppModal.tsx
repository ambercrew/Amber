import { Modal, ModalProps } from "@mantine/core";
import { useCallback, useEffect, useRef } from "react";
import { useIsSmallScreen } from "../../hooks/useIsSmallScreen";
import useBackButtonPress from "../../hooks/useBackButtonPress";
import { safeAreaTopStyle } from "../../utils/safeArea";

/** `styles` is owned by this component, which uses it for the safe area. */
export type AppModalProps = Omit<ModalProps, "styles"> & {
	/**
	 * Whether Android's back button closes the modal. Set it to false while
	 * something layered on top of the modal (a drawer, a nested modal) handles
	 * back itself, so a single press doesn't dismiss both.
	 */
	closeOnBackButton?: boolean;
};

/**
 * Mantine's `Modal` with the app's defaults: centered, full screen once the
 * viewport is too small for a dialog, and — while full screen — padded so its
 * header clears the status bar on mobile and closed by Android's back button.
 */
function AppModal({
	fullScreen,
	centered = true,
	closeButtonProps,
	closeOnEscape = true,
	closeOnBackButton = true,
	opened,
	onClose,
	...others
}: AppModalProps) {
	const isSmallScreen = useIsSmallScreen();
	const isFullScreen = fullScreen ?? isSmallScreen;
	const onCloseRef = useRef(onClose);

	useEffect(() => {
		onCloseRef.current = onClose;
	});

	// Kept stable so the listener is registered once per open, not per render.
	const handleBackButtonPress = useCallback(() => onCloseRef.current(), []);

	// An open modal takes the back button so it dismisses the modal rather than
	// navigating. Modals that refuse escape refuse back too.
	useBackButtonPress(
		handleBackButtonPress,
		opened && closeOnEscape && closeOnBackButton,
	);

	return (
		<Modal
			opened={opened}
			onClose={onClose}
			fullScreen={isFullScreen}
			centered={centered}
			closeOnEscape={closeOnEscape}
			closeButtonProps={{ "aria-label": "Close", ...closeButtonProps }}
			styles={{ content: isFullScreen ? safeAreaTopStyle() : undefined }}
			{...others}
		/>
	);
}

export default AppModal;
