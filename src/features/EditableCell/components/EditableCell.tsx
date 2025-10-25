import { Editor } from "@tiptap/react";
import Cell from "../../../types/backend/entity/cell";
import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import ClozeCell from "./ClozeCell";
import FlashCardCell from "./FlashCardCell";
import TrueFalseCell from "./TrueFalseCell";

interface Props {
	cell: Cell;
	autofocus: boolean;
	eagerLoadRichTextEditor: boolean;
	onUpdate: (content: string) => void;
	onFocus: (editor: Editor) => void;
}

function EditableCell({
	cell,
	autofocus,
	eagerLoadRichTextEditor,
	onUpdate,
	onFocus,
}: Props) {
	switch (cell.cellType) {
		case "FlashCard":
			return (
				<FlashCardCell
					cell={cell}
					autofocus={autofocus}
					onUpdate={onUpdate}
					onFocus={onFocus}
					eagerLoadRichTextEditor={eagerLoadRichTextEditor}
				/>
			);
		case "Note":
			return (
				<RichTextEditor
					content={cell.content}
					autofocus={autofocus}
					eagerLoadRichTextEditor={eagerLoadRichTextEditor}
					onUpdate={onUpdate}
					onFocus={onFocus}
				/>
			);
		case "Cloze":
			return (
				<ClozeCell
					cell={cell}
					autofocus={autofocus}
					eagerLoadRichTextEditor={eagerLoadRichTextEditor}
					onUpdate={onUpdate}
					onFocus={onFocus}
				/>
			);
		case "TrueFalse":
			return (
				<TrueFalseCell
					eagerLoadRichTextEditor={eagerLoadRichTextEditor}
					cell={cell}
					autofocus={autofocus}
					onUpdate={onUpdate}
					onFocus={onFocus}
				/>
			);
	}
}

export default EditableCell;
