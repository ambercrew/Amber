import { HEADER_AND_FOOTER_HEIGHT } from "../../App/components/App";

// Splits kept mounted on each side of the primary split. Live editors ≈ 2 * NEIGHBORS + 1.
export const READING_SPLIT_MOUNT_NEIGHBORS = 1;
// Floor for any placeholder height so empty/near-empty splits stay observable.
export const READING_SPLIT_MIN_HEIGHT_IN_PX = 120;
// Rough px² per content character, for sizing not-yet-measured placeholders:
// height ≈ charCount * AREA / width. Replaced by the real height once mounted.
export const READING_ESTIMATE_CHAR_AREA_IN_PX = 200;
// `charCount` is raw stored bytes, not rendered text length, so this scales
// the estimate back down.
export const READING_ESTIMATE_SCALE = 0.3;
// One localStorage write per settle, not per ResizeObserver tick.
export const READING_HEIGHT_WRITE_DEBOUNCE_IN_MILLISECONDS = 400;
// Height of the fixed app header, offsetting where the viewport top actually is.
export const READING_VIEWPORT_TOP_OFFSET_IN_PX = HEADER_AND_FOOTER_HEIGHT;
