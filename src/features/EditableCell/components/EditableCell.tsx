import { Editor } from "@tiptap/react";
import Cell from "../../../types/backend/entity/cell";
import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import ClozeCell from "./ClozeCell";
import FlashCardCell from "./FlashCardCell";
import TrueFalseCell from "./TrueFalseCell";

interface Props {
	cell: Cell;
	autofocus: boolean;
	editable: boolean;
	onUpdate: (content: string) => void;
	onFocus: (editor: Editor) => void;
}

function EditableCell({ cell, autofocus, editable, onUpdate, onFocus }: Props) {
	switch (cell.cellType) {
		case "FlashCard":
			return (
				<FlashCardCell
					cell={cell}
					autofocus={autofocus}
					onUpdate={onUpdate}
					onFocus={onFocus}
					editable={editable}
				/>
			);
		case "Note":
			return (
				<RichTextEditor
					initialContent={cell.content}
					autofocus={autofocus}
					editable={editable}
					onUpdate={onUpdate}
					onFocus={onFocus}
				/>
			);
		case "Cloze":
			return (
				<ClozeCell
					cell={cell}
					autofocus={autofocus}
					editable={editable}
					onUpdate={onUpdate}
					onFocus={onFocus}
				/>
			);
		case "TrueFalse":
			return (
				<TrueFalseCell
					editable={editable}
					cell={cell}
					autofocus={autofocus}
					onUpdate={onUpdate}
					onFocus={onFocus}
				/>
			);
	}
}

export default EditableCell;
