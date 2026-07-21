import { MantineBreakpoint, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

/** The breakpoint at or below which the viewport counts as a small screen. */
export const SMALL_SCREEN_BREAKPOINT: MantineBreakpoint = "sm";

/** Whether the viewport is at or below the small-screen breakpoint. */
export function useIsSmallScreen(): boolean {
	const theme = useMantineTheme();
	return (
		useMediaQuery(
			`(max-width: ${theme.breakpoints[SMALL_SCREEN_BREAKPOINT]})`,
		) ?? false
	);
}
