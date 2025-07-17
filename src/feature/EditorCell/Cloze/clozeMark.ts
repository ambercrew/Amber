import { mergeAttributes, Mark } from "@tiptap/core";
import "./styles.module.css";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		customExtension: {
			toggleCloze: (index: number) => ReturnType;
			increaseClozeIndex: () => ReturnType;
			decreaseClozeIndex: () => ReturnType;
		};
	}
}

export const clozeMarkName = "cloze";

const clozeMark = Mark.create({
	name: clozeMarkName,

	parseHTML() {
		return [{ tag: clozeMarkName }];
	},

	addAttributes() {
		return {
			index: {
				renderHTML(attributes) {
					return {
						index: attributes.index as number,
					};
				},
			},
		};
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"cloze",
			mergeAttributes(HTMLAttributes, {
				class: "cloze-mark",
			}),
			0,
		];
	},

	addCommands() {
		return {
			toggleCloze:
				index =>
				({ commands, editor }) => {
					if (editor.isActive(clozeMarkName)) {
						return commands.unsetMark(clozeMarkName);
					}

					const { from: selectionStart, to: selectionEnd } =
						editor.state.selection;
					const text = editor.getText();
					if (text.trim() === "") return true;

					let newSelectionStart = selectionStart;
					let newSelectionEnd = selectionEnd;

					// Removing extra whitespace at start.
					while (
						editor.state.doc
							.textBetween(newSelectionStart, newSelectionEnd)
							.endsWith(" ")
					) {
						newSelectionEnd--;
					}

					// Removing extra whitespace at end.
					while (
						editor.state.doc
							.textBetween(newSelectionStart, newSelectionEnd)
							.startsWith(" ")
					) {
						newSelectionStart++;
					}

					commands.setTextSelection({
						from: newSelectionStart,
						to: newSelectionEnd,
					});
					commands.unsetAllMarks();
					return commands.setMark(clozeMarkName, { index });
				},
			increaseClozeIndex:
				() =>
				({ commands, editor }) => {
					if (!editor.isActive(clozeMarkName)) return true;
					commands.extendMarkRange(clozeMarkName);
					return commands.updateAttributes(clozeMarkName, {
						index:
							(editor.getAttributes(clozeMarkName)
								.index as number) + 1,
					});
				},
			decreaseClozeIndex:
				() =>
				({ commands, editor }) => {
					if (!editor.isActive(clozeMarkName)) return true;
					commands.extendMarkRange(clozeMarkName);
					return commands.updateAttributes(clozeMarkName, {
						index: Math.max(
							1,
							(editor.getAttributes(clozeMarkName)
								.index as number) - 1,
						),
					});
				},
		};
	},
});

export default clozeMark;
