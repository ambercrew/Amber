import { useState } from "react";
import {
	ClickAfterLastBlockExtension,
	SelectBlockExtension,
	TabIndentationExtension,
} from "@lexical/extension";
import { HistoryExtension } from "@lexical/history";
import { ListExtension } from "@lexical/list";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { RichTextExtension } from "@lexical/rich-text";
import { defineExtension } from "lexical";
import { Box, Text } from "@mantine/core";
import { DragPlugin } from "./plugins/DragPlugin";
import { SlashMenuPlugin } from "./plugins/SlashMenuPlugin";
import styles from "./Editor.module.css";

const editorTheme = {
	heading: {
		h1: styles["editor-h1"],
		h2: styles["editor-h2"],
		h3: styles["editor-h3"],
	},
	list: {
		listitem: styles["editor-listitem"],
		ol: styles["editor-ol"],
		ul: styles["editor-ul"],
	},
	paragraph: styles["editor-paragraph"],
	quote: styles["editor-quote"],
	text: {
		bold: styles["editor-bold"],
		code: styles["editor-code"],
		italic: styles["editor-italic"],
	},
};

const editorExtension = defineExtension({
	dependencies: [
		RichTextExtension,
		HistoryExtension,
		ListExtension,
		TabIndentationExtension,
		ClickAfterLastBlockExtension,
		SelectBlockExtension,
	],
	name: "brainy/notion-editor",
	namespace: "brainy/notion-editor",
	theme: editorTheme,
});

export default function Editor() {
	const [anchorElem, setAnchorElem] = useState<HTMLElement | null>(null);

	return (
		<LexicalExtensionComposer
			extension={editorExtension}
			contentEditable={null}>
			<Box className={styles.anchor} ref={setAnchorElem}>
				<ContentEditable
					className={styles["content-editable"]}
					aria-label="Rich text editor"
					aria-placeholder="Type '/' for commands..."
					placeholder={
						<Text className={styles.placeholder} c="dimmed">
							Type &apos;/&apos; for commands...
						</Text>
					}
				/>
				<SlashMenuPlugin />
				{anchorElem ? <DragPlugin anchorElem={anchorElem} /> : null}
			</Box>
		</LexicalExtensionComposer>
	);
}
