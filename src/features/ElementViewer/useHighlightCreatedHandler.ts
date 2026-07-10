import { useCallback } from "react";
import { HighlightCreatedPayload } from "../../components/Editor/plugins/HighlightPlugin/highlightCommands";
import useAppDispatch from "../../hooks/useAppDispatch";
import {
	createCardAction,
	createExtractAction,
} from "../../stores/elements/elementsActions";
import { ElementId } from "../../types/elements/elementId";
import { CLOZE_COLOR } from "./useElementViewerButtons";
import {
	CLOZE_HIDDEN_ATTRIBUTE,
	CLOZE_HIDDEN_TAG_NAME,
} from "../../components/Editor/plugins/ClozePlugin/ClozeHiddenNode";

export function useHighlightCreatedHandler(elementId: ElementId | undefined) {
	const dispatch = useAppDispatch();

	return useCallback(
		({ id, html, fullHtml, color }: HighlightCreatedPayload) => {
			if (color === CLOZE_COLOR) {
				void dispatch(
					createCardAction({
						id,
						meta: {
							name: getPlainText(fullHtml).slice(0, 50),
							parent: elementId!,
						},
						front: buildClozeFrontHtml(
							stripOtherHighlights(fullHtml, id),
							id,
						),
						back: stripOtherHighlights(html, id),
					}),
				);
				return;
			}

			void dispatch(
				createExtractAction({
					id,
					meta: {
						name: getPlainText(html).slice(0, 50),
						parent: elementId!,
					},
					content: stripOtherHighlights(html, id),
				}),
			);
		},
		[dispatch, elementId],
	);
}

function getPlainText(html: string): string {
	return (
		new DOMParser().parseFromString(html, "text/html").body.textContent ??
		""
	);
}

// The cloze front is the whole document with the selected phrase swapped for
// a hidden placeholder, so the reader sees it in context. The back is just
// the plain selected phrase (see stripOtherHighlights), with no surrounding
// document and no highlight mark.
function buildClozeFrontHtml(fullHtml: string, highlightId: string): string {
	const dom = new DOMParser().parseFromString(fullHtml, "text/html");
	const marks = dom.querySelectorAll(
		`mark[data-highlight-id="${highlightId}"]`,
	);
	marks.forEach(mark => {
		mark.removeAttribute("data-highlight-id");
		mark.removeAttribute("data-highlight-color");
		mark.removeAttribute("style");
		mark.removeAttribute("class");
		mark.setAttribute("data-cloze-hidden", "true");
	});
	return dom.body.innerHTML;
}

// Unwraps every highlight and cloze other than the one just created, so a new extract
// or cloze copied out of the document doesn't drag unrelated highlights
// along with it. This only touches the HTML being copied into the new
// element — the source document's own highlights are left untouched.
function stripOtherHighlights(
	html: string,
	currentHighlightId: string,
): string {
	const dom = new DOMParser().parseFromString(html, "text/html");
	const marks = dom.querySelectorAll(
		`mark[data-highlight-id], ${CLOZE_HIDDEN_TAG_NAME}[${CLOZE_HIDDEN_ATTRIBUTE}=true]`,
	);
	marks.forEach(mark => {
		if (mark.getAttribute("data-highlight-id") === currentHighlightId)
			return;
		mark.replaceWith(...mark.childNodes);
	});
	return dom.body.innerHTML;
}
