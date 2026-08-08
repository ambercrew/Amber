import { createCommand } from "lexical";
import { type MantineColor } from "@mantine/core";

export const CREATE_HIGHLIGHT_COMMAND = createCommand<MantineColor>(
	"CREATE_HIGHLIGHT_COMMAND",
);

export interface HighlightCreatedPayload {
	id: string;
	/** HTML of just the selected range, before wrapping. */
	html: string;
	/** HTML of the entire document, after wrapping the selection in the highlight. */
	fullHtml: string;
	color: MantineColor;
}
