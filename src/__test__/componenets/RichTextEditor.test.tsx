// TODO:
// import { render } from "@testing-library/react";
// import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
// import {
// 	$createRangeSelection,
// 	$getRoot,
// 	$setSelection,
// 	ElementNode,
// 	LexicalEditor,
// } from "lexical";
// import { act, useEffect } from "react";
// import RichTextEditor from "../../components/RichTextEditor/RichTextEditor";
// import {
// 	$isClozeNode,
// 	ClozeNode,
// } from "../../features/EditableCell/plugins/clozeNode";
// import {
// 	ClozePlugin,
// 	TOGGLE_CLOZE_NODE,
// } from "../../features/EditableCell/plugins/clozePlugin";
//
// vi.mock(import("../../utils/tauriUtils.ts"), () => ({
// 	isAndroid: vi.fn(() => true),
// 	isMobile: () => true,
// }));
//
// // Happy DOM fires selectionchange when Lexical calls setBaseAndExtent, which
// // then hits a frozen property in Happy DOM's Range object. DOM selection state
// // is irrelevant in unit tests, so drop these events before they reach Lexical.
// const _originalDispatchEvent = document.dispatchEvent.bind(document);
// document.dispatchEvent = (event: Event) => {
// 	if (event.type === "selectionchange") return true;
// 	return _originalDispatchEvent(event);
// };
//
// function createEditor(content: string) {
// 	let editor!: LexicalEditor;
//
// 	function CaptureEditorPlugin({
// 		onCapture,
// 	}: {
// 		onCapture: (e: LexicalEditor) => void;
// 	}) {
// 		const [editor] = useLexicalComposerContext();
// 		useEffect(() => onCapture(editor), [editor, onCapture]);
// 		return null;
// 	}
//
// 	render(
// 		<RichTextEditor
// 			content={content}
// 			eagerLoadRichTextEditor={true}
// 			onChange={vi.fn()}
// 			extraNodes={[ClozeNode]}
// 			plugins={[
// 				<ClozePlugin key="cloze" />,
// 				<CaptureEditorPlugin
// 					key="capture"
// 					onCapture={e => {
// 						editor = e;
// 					}}
// 				/>,
// 			]}
// 		/>,
// 	);
// 	return editor;
// }
//
// interface SetSelectionInput {
// 	firstTextPosition: number[];
// 	firstTextOffset: number;
// 	lastTextPosition: number[];
// 	lastTextOffset: number;
// }
//
// function $setSelectionHelper(input: SetSelectionInput) {
// 	let firstChild = $getRoot() as ElementNode;
// 	for (const index of input.firstTextPosition) {
// 		firstChild = firstChild.getChildren()[index] as ElementNode;
// 	}
//
// 	let lastChild = $getRoot() as ElementNode;
// 	for (const index of input.lastTextPosition) {
// 		lastChild = lastChild.getChildren()[index] as ElementNode;
// 	}
//
// 	const selection = $createRangeSelection();
// 	selection.anchor.set(firstChild.getKey(), input.firstTextOffset, "text");
// 	selection.focus.set(lastChild.getKey(), input.lastTextOffset, "text");
//
// 	$setSelection(selection);
// }
//
// describe("Cloze toggle", () => {
// 	it("Should join two separate cloze nodes into one when toggling cloze with a selection spanning both", () => {
// 		// Arrange
//
// 		const content = `
//         <p>
//             <cloze class="cloze-node" index="1"><b>foo</b></cloze>bar
//             <cloze class="cloze-node" index="1">baz</cloze>
//         </p>`;
// 		const editor: LexicalEditor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 0, 0],
// 						firstTextOffset: 0,
// 						lastTextPosition: [0, 2, 0],
// 						lastTextOffset: 3,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const para = $getRoot().getFirstChildOrThrow() as ElementNode;
// 			const children = para.getChildren();
//
// 			expect(children).toHaveLength(1);
// 			expect($isClozeNode(children[0])).toBe(true);
// 			expect(children[0].getTextContent()).toBe("foobarbaz");
// 		});
// 	});
//
// 	it("Should remove cloze from both paragraphs when toggling off a selection spanning two paragraphs", () => {
// 		// Arrange
//
// 		const content = `
//             <p><cloze class="cloze-node" index="1">foo</cloze></p>
//             <p><cloze class="cloze-node" index="1">bar</cloze></p>`;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 0, 0],
// 						firstTextOffset: 0,
// 						lastTextPosition: [1, 0, 0],
// 						lastTextOffset: 3,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const root = $getRoot() as ElementNode;
//
// 			const para1 = root.getChildren()[0] as ElementNode;
// 			expect(para1.getChildren()).toHaveLength(1);
// 			expect($isClozeNode(para1.getChildren()[0])).toBe(false);
// 			expect(para1.getTextContent()).toBe("foo");
//
// 			const para2 = root.getChildren()[1] as ElementNode;
// 			expect(para2.getChildren()).toHaveLength(1);
// 			expect($isClozeNode(para2.getChildren()[0])).toBe(false);
// 			expect(para2.getTextContent()).toBe("bar");
// 		});
// 	});
//
// 	it("Should wrap in cloze when text spanning two paragraph", () => {
// 		// Arrange
//
// 		const content = `
//             <p>foo</p>
//             <p>bar</p>`;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 0],
// 						firstTextOffset: 0,
// 						lastTextPosition: [1, 0],
// 						lastTextOffset: 3,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const root = $getRoot() as ElementNode;
//
// 			const para1 = root.getChildren()[0] as ElementNode;
// 			expect(para1.getChildren()).toHaveLength(1);
// 			expect($isClozeNode(para1.getChildren()[0])).toBe(true);
// 			expect(para1.getTextContent()).toBe("foo");
//
// 			const para2 = root.getChildren()[1] as ElementNode;
// 			expect(para2.getChildren()).toHaveLength(1);
// 			expect($isClozeNode(para2.getChildren()[0])).toBe(true);
// 			expect(para2.getTextContent()).toBe("bar");
// 		});
// 	});
//
// 	it("Should wrap each list item in its own cloze when selection spans multiple list items", () => {
// 		// Arrange
//
// 		const content = `
//             <ul>
//                 <li>foo</li>
//                 <li>bar</li>
//             </ul>`;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 0, 0],
// 						firstTextOffset: 0,
// 						lastTextPosition: [0, 1, 0],
// 						lastTextOffset: 3,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const list = $getRoot().getFirstChildOrThrow() as ElementNode;
// 			const items = list.getChildren();
// 			expect(items).toHaveLength(2);
//
// 			const firstItem = items[0] as ElementNode;
// 			expect(firstItem.getChildren()).toHaveLength(1);
// 			expect($isClozeNode(firstItem.getChildren()[0])).toBe(true);
// 			expect(firstItem.getTextContent()).toBe("foo");
//
// 			const secondItem = items[1] as ElementNode;
// 			expect(secondItem.getChildren()).toHaveLength(1);
// 			expect($isClozeNode(secondItem.getChildren()[0])).toBe(true);
// 			expect(secondItem.getTextContent()).toBe("bar");
// 		});
// 	});
//
// 	it("Should split cloze into three parts when toggling off a selection in the middle of a cloze", () => {
// 		// Arrange
//
// 		const content = `<p><cloze class="cloze-node" index="1">abcdef</cloze></p>`;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 0, 0],
// 						firstTextOffset: 2,
// 						lastTextPosition: [0, 0, 0],
// 						lastTextOffset: 4,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert: "ab" stays cloze'd, "cd" is unwrapped, "ef" stays cloze'd
//
// 		editor.read(() => {
// 			const para = $getRoot().getFirstChildOrThrow() as ElementNode;
// 			const children = para.getChildren();
//
// 			expect(children).toHaveLength(3);
// 			expect($isClozeNode(children[0])).toBe(true);
// 			expect(children[0].getTextContent()).toBe("ab");
// 			expect($isClozeNode(children[1])).toBe(false);
// 			expect(children[1].getTextContent()).toBe("cd");
// 			expect($isClozeNode(children[2])).toBe(true);
// 			expect(children[2].getTextContent()).toBe("ef");
// 		});
// 	});
//
// 	it("Should unwrap start of cloze and keep remainder cloze'd when toggling off a selection at the start", () => {
// 		// Arrange
//
// 		const content = `<p><cloze class="cloze-node" index="1">abcdef</cloze></p>`;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 0, 0],
// 						firstTextOffset: 0,
// 						lastTextPosition: [0, 0, 0],
// 						lastTextOffset: 2,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert: "ab" is unwrapped, "cdef" stays cloze'd
//
// 		editor.read(() => {
// 			const para = $getRoot().getFirstChildOrThrow() as ElementNode;
// 			const children = para.getChildren();
//
// 			expect(children).toHaveLength(2);
// 			expect($isClozeNode(children[0])).toBe(false);
// 			expect(children[0].getTextContent()).toBe("ab");
// 			expect($isClozeNode(children[1])).toBe(true);
// 			expect(children[1].getTextContent()).toBe("cdef");
// 		});
// 	});
//
// 	it("Should unwrap end of cloze and keep prefix cloze'd when toggling off a selection at the end", () => {
// 		// Arrange
//
// 		const content = `<p><cloze class="cloze-node" index="1">abcdef</cloze></p>`;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 0, 0],
// 						firstTextOffset: 4,
// 						lastTextPosition: [0, 0, 0],
// 						lastTextOffset: 6,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const para = $getRoot().getFirstChildOrThrow() as ElementNode;
// 			const children = para.getChildren();
//
// 			expect(children).toHaveLength(2);
// 			expect($isClozeNode(children[0])).toBe(true);
// 			expect(children[0].getTextContent()).toBe("abcd");
// 			expect($isClozeNode(children[1])).toBe(false);
// 			expect(children[1].getTextContent()).toBe("ef");
// 		});
// 	});
//
// 	it("Should wrap into a cloze when selection starts at the middle of a normal text node and ends inside a cloze", () => {
// 		// Arrange
//
// 		const content = `<p>hello<cloze class="cloze-node" index="1">world</cloze></p>`;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 0],
// 						firstTextOffset: 2,
// 						lastTextPosition: [0, 1, 0],
// 						lastTextOffset: 3,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const para = $getRoot().getFirstChildOrThrow() as ElementNode;
// 			const children = para.getChildren();
//
// 			expect(children).toHaveLength(2);
// 			expect($isClozeNode(children[0])).toBe(false);
// 			expect(children[0].getTextContent()).toBe("he");
// 			expect($isClozeNode(children[1])).toBe(true);
// 			expect(children[1].getTextContent()).toBe("lloworld");
// 		});
// 	});
//
// 	it("Should wrap into a cloze when selection starts inside a cloze and ends at the middle of a normal text node", () => {
// 		// Arrange
//
// 		const content = `
// 			<p>
// 				<cloze class="cloze-node" index="1">hello</cloze>
// 				world
// 			</p>`;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 0, 0],
// 						firstTextOffset: 2,
// 						lastTextPosition: [0, 1],
// 						lastTextOffset: 3,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const para = $getRoot().getFirstChildOrThrow() as ElementNode;
// 			const children = para.getChildren();
//
// 			expect(children).toHaveLength(2);
// 			expect($isClozeNode(children[0])).toBe(true);
// 			expect(children[0].getTextContent()).toBe("hellowor");
// 			expect($isClozeNode(children[1])).toBe(false);
// 			expect(children[1].getTextContent()).toBe("ld");
// 		});
// 	});
//
// 	it("Should unwrap where there are different text type in the middle", () => {
// 		// Arrange
//
// 		const content = `
//         <p>
//             <cloze class="cloze-node" index="1">
//                 <span>test </span>
//                 <sup><span>12345</span></sup>
//                 <span> test</span>
//             </cloze>
//         </p>`;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 0, 0],
// 						firstTextOffset: 2,
// 						lastTextPosition: [0, 0, 2],
// 						lastTextOffset: 3,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const para = $getRoot().getFirstChildOrThrow() as ElementNode;
// 			const children = para.getChildren();
//
// 			expect(children).toHaveLength(5);
//
// 			expect($isClozeNode(children[0])).toBe(true);
// 			expect(children[0].getTextContent()).toBe("te");
//
// 			expect($isClozeNode(children[1])).toBe(false);
// 			expect(children[1].getTextContent()).toBe("st ");
//
// 			expect($isClozeNode(children[2])).toBe(false);
// 			expect(children[2].getTextContent()).toBe("12345");
//
// 			expect($isClozeNode(children[3])).toBe(false);
// 			expect(children[3].getTextContent()).toBe(" te");
//
// 			expect($isClozeNode(children[4])).toBe(true);
// 			expect(children[4].getTextContent()).toBe("st");
// 		});
// 	});
//
// 	it("Should skip whitespace at start and at end", () => {
// 		// Arrange
//
// 		const content = `
//         <p>
//             <span>&nbsp;&nbsp;test&nbsp;&nbsp;</span>
//         </p>`;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 0],
// 						firstTextOffset: 0,
// 						lastTextPosition: [0, 0],
// 						lastTextOffset: 8,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const para = $getRoot().getFirstChildOrThrow() as ElementNode;
// 			const children = para.getChildren();
//
// 			expect(children).toHaveLength(3);
//
// 			expect($isClozeNode(children[0])).toBe(false);
// 			expect(children[0].getTextContent()).toHaveLength(2);
//
// 			expect($isClozeNode(children[1])).toBe(true);
// 			expect(children[1].getTextContent()).toBe("test");
//
// 			expect($isClozeNode(children[2])).toBe(false);
// 			expect(children[2].getTextContent()).toHaveLength(2);
// 		});
// 	});
//
// 	it("Should be able to handle partial toggling across many paragraphs", () => {
// 		// Arrange
//
// 		const content = `
//         <p>
//             <cloze class="cloze-node" index="1">
//                 <sup>[16]</sup>
//             </cloze>
//         </p>
//
//         <p>
//             <cloze class="cloze-node" index="1">
//                 <span>The primary goal of Zig is to be a better solution to the sorts of tasks that are currently solved with C. A primary concern in that respect is readability; Zig attempts to use existing concepts and syntax wherever possible, avoiding the addition of different syntax for similar concepts. Further, its goal is to be a language designed for "robustness, optimality and maintainability". The small and simple syntax is an important part of the maintenance, as it is a goal of the language to allow maintainers to debug the code without having to learn the intricacies of a language they might not be familiar with.</span><sup><span>[17]</span></sup><span> Even</span>
//                <span> with these changes, Zig can compile into and against existing C code; C headers can be included in a Zig project and their functions called, and Zig code can be linked into C projects by including the compiler-built headers.</span><sup><span>[18]</span></sup>
//            </cloze>
//         </p>
//         `;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 0, 0],
// 						firstTextOffset: 0,
// 						lastTextPosition: [1, 0, 0],
// 						lastTextOffset: 176,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const rootChildren = $getRoot().getChildren();
// 			expect(rootChildren).toHaveLength(2);
//
// 			const firstPara = rootChildren[0] as ElementNode;
// 			const firstParaChildren = firstPara.getChildren();
// 			expect(firstParaChildren).toHaveLength(1);
// 			expect($isClozeNode(firstParaChildren[0])).toBe(false);
// 			expect(firstParaChildren[0].getTextContent()).toBe("[16]");
//
// 			const secondPara = rootChildren[1] as ElementNode;
// 			const secondParaChildren = secondPara.getChildren();
// 			expect(secondParaChildren).toHaveLength(2);
//
// 			expect($isClozeNode(secondParaChildren[0])).toBe(false);
// 			expect(
// 				secondParaChildren[0]
// 					.getTextContent()
// 					.startsWith("The primary goal"),
// 			).toBeTruthy();
// 			expect(
// 				secondParaChildren[0]
// 					.getTextContent()
// 					.endsWith("Zig attempts to use"),
// 			).toBeTruthy();
//
// 			expect($isClozeNode(secondParaChildren[1])).toBe(true);
// 			expect(
// 				secondParaChildren[1]
// 					.getTextContent()
// 					.startsWith(" existing concepts"),
// 			).toBeTruthy();
// 			expect(
// 				secondParaChildren[1].getTextContent().endsWith("headers.[18]"),
// 			).toBeTruthy();
// 		});
// 	});
//
// 	it("Should be able to handle selection starting at the element", () => {
// 		// Arrange
//
// 		const content = `
//         <p>
//             <cloze class="cloze-node" index="1">
//                 <sup>[16]</sup>
//             </cloze>
//         </p>
//
//         <p>
//             <cloze class="cloze-node" index="1">test 123</cloze>
//         </p>
//         `;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					let firstChild = $getRoot() as ElementNode;
// 					firstChild = firstChild.getChildren()[0] as ElementNode;
// 					firstChild = firstChild.getChildren()[0] as ElementNode;
//
// 					let lastChild = $getRoot() as ElementNode;
// 					lastChild = lastChild.getChildren()[1] as ElementNode;
// 					lastChild = lastChild.getChildren()[0] as ElementNode;
// 					lastChild = lastChild.getChildren()[0] as ElementNode;
//
// 					const selection = $createRangeSelection();
// 					selection.anchor.set(firstChild.getKey(), 0, "element");
// 					selection.focus.set(lastChild.getKey(), 4, "text");
//
// 					$setSelection(selection);
//
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const rootChildren = $getRoot().getChildren();
// 			expect(rootChildren).toHaveLength(2);
//
// 			const firstPara = rootChildren[0] as ElementNode;
// 			const firstParaChildren = firstPara.getChildren();
// 			expect(firstParaChildren).toHaveLength(1);
// 			expect($isClozeNode(firstParaChildren[0])).toBe(false);
// 			expect(firstParaChildren[0].getTextContent()).toBe("[16]");
//
// 			const secondPara = rootChildren[1] as ElementNode;
// 			const secondParaChildren = secondPara.getChildren();
// 			expect(secondParaChildren).toHaveLength(2);
//
// 			expect($isClozeNode(secondParaChildren[0])).toBe(false);
// 			expect(secondParaChildren[0].getTextContent()).toBe("test");
//
// 			expect($isClozeNode(secondParaChildren[1])).toBe(true);
// 			expect(secondParaChildren[1].getTextContent()).toBe(" 123");
// 		});
// 	});
//
// 	it("Should default to index 1 when no cloze nodes exist in the editor", () => {
// 		// Arrange
//
// 		const content = `<p>hello world</p>`;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 0],
// 						firstTextOffset: 0,
// 						lastTextPosition: [0, 0],
// 						lastTextOffset: 5,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const para = $getRoot().getFirstChildOrThrow() as ElementNode;
// 			const children = para.getChildren();
//
// 			expect($isClozeNode(children[0])).toBe(true);
// 			expect((children[0] as ClozeNode).index).toBe(1);
// 		});
// 	});
//
// 	it("Should default to the highest existing cloze index when wrapping plain text", () => {
// 		// Arrange
//
// 		const content = `
// 		<p>
// 			<cloze class="cloze-node" index="3">foo</cloze>
// 			<cloze class="cloze-node" index="1">bar</cloze>
// 			plain
// 		</p>`;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 2],
// 						firstTextOffset: 0,
// 						lastTextPosition: [0, 2],
// 						lastTextOffset: 5,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const para = $getRoot().getFirstChildOrThrow() as ElementNode;
// 			const children = para.getChildren();
//
// 			const newCloze = children.find(
// 				(c, i) => $isClozeNode(c) && i === 2,
// 			) as ClozeNode;
// 			expect($isClozeNode(newCloze)).toBe(true);
// 			expect(newCloze.index).toBe(3);
// 		});
// 	});
//
// 	it("Should use the single existing cloze index as default when wrapping new text", () => {
// 		// Arrange
//
// 		const content = `<p><cloze class="cloze-node" index="2">foo</cloze>bar</p>`;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					$setSelectionHelper({
// 						firstTextPosition: [0, 1],
// 						firstTextOffset: 0,
// 						lastTextPosition: [0, 1],
// 						lastTextOffset: 3,
// 					});
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const para = $getRoot().getFirstChildOrThrow() as ElementNode;
// 			const children = para.getChildren();
//
// 			expect(children).toHaveLength(2);
// 			expect($isClozeNode(children[1])).toBe(true);
// 			expect((children[1] as ClozeNode).index).toBe(2);
// 		});
// 	});
//
// 	/// This test is similar to last test, only different is that the selection
// 	// starts from the paragraph and not inner node which might not work
// 	// if not implemented correctly.
// 	it("Should be able to handle selection starting at the paragraph", () => {
// 		// Arrange
//
// 		const content = `
//         <p>
//             <cloze class="cloze-node" index="1">
//                 <sup>[16]</sup>
//             </cloze>
//         </p>
//
//         <p>
//             <cloze class="cloze-node" index="1">test 123</cloze>
//         </p>
//         `;
// 		const editor = createEditor(content);
//
// 		// Act
//
// 		act(() => {
// 			editor.update(
// 				() => {
// 					let firstChild = $getRoot() as ElementNode;
// 					firstChild = firstChild.getChildren()[0] as ElementNode;
//
// 					let lastChild = $getRoot() as ElementNode;
// 					lastChild = lastChild.getChildren()[1] as ElementNode;
// 					lastChild = lastChild.getChildren()[0] as ElementNode;
// 					lastChild = lastChild.getChildren()[0] as ElementNode;
//
// 					const selection = $createRangeSelection();
// 					selection.anchor.set(firstChild.getKey(), 0, "element");
// 					selection.focus.set(lastChild.getKey(), 4, "text");
//
// 					$setSelection(selection);
//
// 					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
// 				},
// 				{ discrete: true },
// 			);
// 		});
//
// 		// Assert
//
// 		editor.read(() => {
// 			const rootChildren = $getRoot().getChildren();
// 			expect(rootChildren).toHaveLength(2);
//
// 			const firstPara = rootChildren[0] as ElementNode;
// 			const firstParaChildren = firstPara.getChildren();
// 			expect(firstParaChildren).toHaveLength(1);
// 			expect($isClozeNode(firstParaChildren[0])).toBe(false);
// 			expect(firstParaChildren[0].getTextContent()).toBe("[16]");
//
// 			const secondPara = rootChildren[1] as ElementNode;
// 			const secondParaChildren = secondPara.getChildren();
// 			expect(secondParaChildren).toHaveLength(2);
//
// 			expect($isClozeNode(secondParaChildren[0])).toBe(false);
// 			expect(secondParaChildren[0].getTextContent()).toBe("test");
//
// 			expect($isClozeNode(secondParaChildren[1])).toBe(true);
// 			expect(secondParaChildren[1].getTextContent()).toBe(" 123");
// 		});
// 	});
// });
