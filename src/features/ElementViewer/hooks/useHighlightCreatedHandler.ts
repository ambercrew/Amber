import { useCallback } from "react";
import { $createTextNode } from "lexical";
import { $unwrapMarkNode } from "@lexical/mark";
import { $dfs } from "@lexical/utils";
import { serializedNodesToLexicalJson } from "../../../components/Editor/lexicalJsonConversion";
import { HighlightCreatedPayload } from "../../../components/Editor/plugins/HighlightPlugin/highlightCommands";
import {
	$createClozeHiddenNode,
	$isClozeHiddenNode,
} from "../../../components/Editor/plugins/ClozePlugin/ClozeHiddenNode";
import { $isHighlightNode } from "../../../components/Editor/plugins/HighlightPlugin/HighlightNode";
import useAppDispatch from "../../../hooks/useAppDispatch";
import {
	createCardAction,
	createExtractAction,
} from "../../../stores/elements/elementsActions";
import { ElementId } from "../../../types/elements/elementId";
import { CLOZE_COLOR } from "./useElementViewerButtons";

export function useHighlightCreatedHandler(
	elementId: ElementId | undefined,
	bibliographicalSourceId: string | null | undefined,
) {
	const dispatch = useAppDispatch();

	return useCallback(
		({
			id,
			selectionNodes,
			fullNodes,
			selectionText,
			fullText,
			color,
		}: HighlightCreatedPayload) => {
			if (color === CLOZE_COLOR) {
				void dispatch(
					createCardAction({
						id,
						meta: {
							name: truncateToWords(fullText),
							parent: elementId!,
							derivedFrom: elementId!,
							bibliographicalSourceId,
						},
						front: serializedNodesToLexicalJson(fullNodes, () => {
							$stripOtherHighlights(id);
							$buildClozeFront(id);
						}),
						back: serializedNodesToLexicalJson(selectionNodes, () =>
							$stripOtherHighlights(id),
						),
					}),
				);
				return;
			}

			void dispatch(
				createExtractAction({
					id,
					meta: {
						name: truncateToWords(selectionText),
						parent: elementId!,
						derivedFrom: elementId!,
						bibliographicalSourceId,
					},
					content: serializedNodesToLexicalJson(selectionNodes, () =>
						$stripOtherHighlights(id),
					),
				}),
			);
		},
		[dispatch, elementId, bibliographicalSourceId],
	);
}

// Only used for names and is not a hard requirement.
const NAME_MAX_LENGTH = 50;

// Cuts at the last word boundary within the limit instead of mid-word, so
// names read as a few whole words rather than a truncated fragment.
function truncateToWords(text: string, maxLength = NAME_MAX_LENGTH): string {
	const trimmed = text.trim();
	if (trimmed.length <= maxLength) return trimmed;

	const truncated = trimmed.slice(0, maxLength);
	const lastSpace = truncated.lastIndexOf(" ");
	return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
}

// The cloze front is the whole document with the selected phrase swapped for
// a hidden placeholder, so the reader sees it in context. The back is just
// the plain selected phrase (see $stripOtherHighlights), with no surrounding
// document and no highlight mark.
function $buildClozeFront(highlightId: string): void {
	for (const { node } of $dfs()) {
		if ($isHighlightNode(node) && node.getHighlightId() === highlightId) {
			node.replace($createClozeHiddenNode(node.getTextContent()));
		}
	}
}

// Unwraps every highlight and cloze other than the one just created, so a new
// extract or cloze copied out of the document doesn't drag unrelated
// highlights along with it. This only touches the standalone node tree being
// copied into the new element — the source document's own highlights are
// left untouched. `$dfs()` snapshots the tree up front, so replacing/removing
// nodes while iterating is safe.
function $stripOtherHighlights(currentHighlightId: string): void {
	for (const { node } of $dfs()) {
		if (
			$isHighlightNode(node) &&
			node.getHighlightId() !== currentHighlightId
		) {
			$unwrapMarkNode(node);
		} else if ($isClozeHiddenNode(node)) {
			node.replace($createTextNode(node.getHiddenText()));
		}
	}
}
