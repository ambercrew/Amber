import { CSSProperties } from "react";
import { isMobile } from "./tauriUtils";

/** Height of the status bar / notch that mobile webviews draw underneath. */
export const SAFE_AREA_TOP = "env(safe-area-inset-top)";

/** Height of the gesture bar / home indicator that mobile webviews draw above. */
export const SAFE_AREA_BOTTOM = "env(safe-area-inset-bottom)";

/**
 * Padding that clears the status bar for anything drawn at the very top of a
 * mobile screen. Undefined on desktop, where nothing overlaps the window.
 */
export function safeAreaTopStyle(): CSSProperties | undefined {
	return isMobile() ? { paddingTop: SAFE_AREA_TOP } : undefined;
}
