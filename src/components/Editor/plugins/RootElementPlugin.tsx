import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

interface RootElementPluginProps {
	/** Called with the editable root (or `null` on unmount / root swap). */
	onRootElement: (element: HTMLElement | null) => void;
}

/**
 * Reports the editor's root element — the contenteditable whose direct children
 * are the top-level blocks — to the parent. Lets callers read block geometry
 * (e.g. reading-position restore) through Lexical's own API instead of querying
 * the DOM for its internals. Fires immediately with the current root, on every
 * root change, and with `null` when the editor unmounts.
 */
export default function RootElementPlugin({
	onRootElement,
}: RootElementPluginProps) {
	const [editor] = useLexicalComposerContext();
	useEffect(() => {
		const unregister = editor.registerRootListener(root =>
			onRootElement(root),
		);
		return () => {
			unregister();
			onRootElement(null);
		};
	}, [editor, onRootElement]);
	return null;
}
