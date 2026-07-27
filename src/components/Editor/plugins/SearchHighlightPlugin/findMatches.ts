export interface TextMatch {
	start: number;
	end: number;
}

/**
 * Finds every occurrence of `query` in `text` as plain substring matches
 * (no regex — the query is literal user input, not a pattern). Matches are
 * allowed to overlap (e.g. "aa" in "aaa" yields two matches), matching how
 * native browser find-in-page behaves.
 */
export function findMatches(
	text: string,
	query: string,
	caseSensitive: boolean,
): TextMatch[] {
	if (!query) return [];

	const haystack = caseSensitive ? text : text.toLowerCase();
	const needle = caseSensitive ? query : query.toLowerCase();

	const matches: TextMatch[] = [];
	let fromIndex = 0;
	for (;;) {
		const index = haystack.indexOf(needle, fromIndex);
		if (index === -1) break;
		matches.push({ start: index, end: index + needle.length });
		fromIndex = index + 1;
	}
	return matches;
}
