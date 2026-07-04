import { useEffect } from "react";
import { act, render } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { $generateNodesFromDOM } from "@lexical/html";
import { $dfs } from "@lexical/utils";
import { $getRoot, $insertNodes, LexicalEditor } from "lexical";
import {
	$isImageNode,
	ImageNode,
} from "../../../../components/Editor/plugins/ImagePlugin/ImageNode";

function EditorCapture({
	onReady,
}: {
	onReady: (editor: LexicalEditor) => void;
}) {
	const [editor] = useLexicalComposerContext();
	useEffect(() => onReady(editor), [editor, onReady]);
	return null;
}

function renderEditor() {
	let capturedEditor: LexicalEditor | null = null;

	render(
		<MantineProvider>
			<LexicalComposer
				initialConfig={{
					namespace: "test",
					nodes: [ImageNode],
					onError: error => {
						throw error;
					},
				}}>
				<RichTextPlugin
					contentEditable={<ContentEditable aria-label="editor" />}
					placeholder={null}
					ErrorBoundary={LexicalErrorBoundary}
				/>
				<EditorCapture
					onReady={editor => {
						capturedEditor = editor;
					}}
				/>
			</LexicalComposer>
		</MantineProvider>,
	);

	if (!capturedEditor) throw new Error("Editor was not captured");
	return capturedEditor as LexicalEditor;
}

// Editor.tsx's htmlToEditorState parses saved HTML through a detached
// DOMParser document (never attached to the live DOM) to rebuild editor
// state on load. This mirrors that exact parse path.
function importHtmlIntoImageNode(editor: LexicalEditor, html: string) {
	let imageNode: ImageNode | null = null;
	act(() => {
		editor.update(
			() => {
				const dom = new DOMParser().parseFromString(html, "text/html");
				const nodes = $generateNodesFromDOM(editor, dom);
				$getRoot().clear();
				$insertNodes(nodes);
				const found = $dfs().find(({ node }) => $isImageNode(node));
				imageNode =
					found && $isImageNode(found.node) ? found.node : null;
			},
			{ discrete: true },
		);
	});
	if (!imageNode) throw new Error("Image node not found after import");
	return imageNode as ImageNode;
}

describe("ImageNode importDOM", () => {
	it("Should keep width and height as inherit when the saved img has no size attributes", () => {
		// Arrange

		const editor = renderEditor();
		const html =
			'<p><img src="data:image/png;base64,AAAA" alt="Pasted image"></p>';

		// Act

		const imageNode = importHtmlIntoImageNode(editor, html);

		// Assert

		editor.read(() => {
			expect(imageNode.__width).toBe("inherit");
			expect(imageNode.__height).toBe("inherit");
		});
	});

	it("Should treat width=0 height=0 attributes as inherit instead of a real size", () => {
		// Arrange

		const editor = renderEditor();
		const html =
			'<p><img src="data:image/png;base64,AAAA" alt="Pasted image" width="0" height="0"></p>';

		// Act

		const imageNode = importHtmlIntoImageNode(editor, html);

		// Assert

		editor.read(() => {
			expect(imageNode.__width).toBe("inherit");
			expect(imageNode.__height).toBe("inherit");
		});
	});

	it("Should keep an explicit positive width and height from the saved img attributes", () => {
		// Arrange

		const editor = renderEditor();
		const html =
			'<p><img src="data:image/png;base64,AAAA" alt="Pasted image" width="300" height="200"></p>';

		// Act

		const imageNode = importHtmlIntoImageNode(editor, html);

		// Assert

		editor.read(() => {
			expect(imageNode.__width).toBe(300);
			expect(imageNode.__height).toBe(200);
		});
	});
});
