import { useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isLinkNode, LinkNode } from "@lexical/link";
import { $findMatchingParent } from "@lexical/utils";
import {
	$getNearestNodeFromDOMNode,
	CLICK_COMMAND,
	COMMAND_PRIORITY_LOW,
} from "lexical";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Text } from "@mantine/core";
import ConfirmModal from "../../../AppModal/ConfirmModal";

/**
 * The editor is always editable, so a plain click on a link must place the
 * cursor rather than navigate. Only ctrl/cmd+click opens the link, and only
 * after the user confirms the URL in a modal — it opens in the user's
 * default browser rather than navigating the webview.
 */
export function LinkClickPlugin() {
	const [editor] = useLexicalComposerContext();
	const [pendingUrl, setPendingUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!editor.hasNodes([LinkNode])) {
			throw new Error(
				"LinkClickPlugin: LinkNode not registered in editor",
			);
		}
		return editor.registerCommand(
			CLICK_COMMAND,
			event => {
				if (!event.ctrlKey && !event.metaKey) return false;
				if (!(event.target instanceof Node)) return false;

				const clickedNode = $getNearestNodeFromDOMNode(event.target);
				const linkNode =
					clickedNode &&
					$findMatchingParent(clickedNode, $isLinkNode);
				if (!linkNode) return false;

				event.preventDefault();
				setPendingUrl(linkNode.getURL());
				return true;
			},
			COMMAND_PRIORITY_LOW,
		);
	}, [editor]);

	return (
		<ConfirmModal
			opened={pendingUrl !== null}
			title="Open link"
			confirmLabel="Open"
			onConfirm={() => {
				if (pendingUrl) void openUrl(pendingUrl);
			}}
			onClose={() => setPendingUrl(null)}>
			<Text style={{ overflowWrap: "break-word" }}>{pendingUrl}</Text>
		</ConfirmModal>
	);
}
