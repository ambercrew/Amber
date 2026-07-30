import { useMediaQuery } from "@mantine/hooks";

/** Whether the primary pointer is touch (coarse) rather than a mouse/trackpad (fine). */
export function useIsCoarsePointer(): boolean {
	return useMediaQuery("(pointer: coarse)") ?? false;
}
