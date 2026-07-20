// Number of splits kept mounted on each side of the split currently at the top
// of the viewport. Total live editors ≈ 2 * NEIGHBORS + 1, regardless of
// how many splits the reading has.
export const READING_SPLIT_MOUNT_NEIGHBORS = 1;
// Floor for any placeholder height so empty/near-empty splits stay observable.
export const READING_SPLIT_MIN_HEIGHT_IN_PX = 120;
// Heuristic "character area" per stored content character, in px², used only to
// size not-yet-measured placeholders: `height ≈ charCount * AREA / width`.
// Rough on purpose — measured heights replace estimates as splits mount.
export const READING_ESTIMATE_CHAR_AREA_IN_PX = 200;
// `charCount` is LENGTH(content), i.e. the raw stored HTML/Lexical-JSON bytes,
// not rendered text length — markup and JSON structure inflate it well past
// what's actually visible. This scales the raw estimate back down to compensate.
export const READING_ESTIMATE_SCALE = 0.3;
// One localStorage write per settle, not per ResizeObserver tick.
export const READING_HEIGHT_WRITE_DEBOUNCE_IN_MILLISECONDS = 400;
// Fixed height of the app header/footer; the visible reading region sits below
// the header, so position math offsets the viewport top by this much.
export const READING_VIEWPORT_TOP_OFFSET_IN_PX = 56;
