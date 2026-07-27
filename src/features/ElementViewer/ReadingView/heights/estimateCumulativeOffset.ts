import { ReadingSplitMetaDto } from "../../../../types/elements/readingSplitMetaDto";

/** Sums the best-known height of every split before `targetSeq`, in document order. */
export function estimateOffsetBeforeSplit(
	splits: ReadingSplitMetaDto[],
	targetSeq: number,
	getHeight: (seq: number, charCount: number) => number,
): number {
	let offset = 0;
	for (const split of splits) {
		if (split.seq === targetSeq) break;
		offset += getHeight(split.seq, split.charCount);
	}
	return offset;
}
