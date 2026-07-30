import { Box } from "@mantine/core";
import { isMobile } from "../../utils/tauriUtils";
import { SAFE_AREA_TOP } from "../../utils/safeArea";

/**
 * Android draws the webview edge-to-edge under the status bar, and the
 * AppShell header (which normally covers that strip) slides away on scroll
 * via useHeadroom, leaving the status bar area transparent so scrolled
 * content shows through it. This renders an always-on strip that never
 * collapses, so the status bar area stays opaque regardless of header state.
 */
function SafeAreaTopBackdrop() {
	if (!isMobile()) return null;

	return (
		<Box
			bg="var(--mantine-color-body)"
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				height: SAFE_AREA_TOP,
				zIndex: 101,
				pointerEvents: "none",
			}}
		/>
	);
}

export default SafeAreaTopBackdrop;
