import Cell from "../../../types/backend/entity/cell";
import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import ClozeCell from "./ClozeCell";
import FlashCardCell from "./FlashCardCell";
import TrueFalseCell from "./TrueFalseCell";
import { LexicalEditor } from "lexical";

interface Props {
	cell: Cell;
	autofocus: boolean;
	eagerLoadRichTextEditor: boolean;
	onChange: (content: string) => void;
	onFocus: (editor: LexicalEditor) => void;
}

function EditableCell({
	cell,
	autofocus,
	eagerLoadRichTextEditor,
	onChange,
	onFocus,
}: Props) {
	switch (cell.cellType) {
		case "FlashCard":
			return (
				<FlashCardCell
					cell={cell}
					autofocus={autofocus}
					eagerLoadRichTextEditor={eagerLoadRichTextEditor}
					onChange={onChange}
					onFocus={onFocus}
				/>
			);
		case "Note":
			return (
				<RichTextEditor
					content={cell.content}
					autofocus={autofocus}
					eagerLoadRichTextEditor={eagerLoadRichTextEditor}
					onChange={onChange}
					onFocus={onFocus}
				/>
			);
		case "Cloze":
			return (
				<ClozeCell
					cell={cell}
					autofocus={autofocus}
					eagerLoadRichTextEditor={eagerLoadRichTextEditor}
					onChange={onChange}
					onFocus={onFocus}
				/>
			);
		case "TrueFalse":
			return (
				<TrueFalseCell
					cell={cell}
					autofocus={autofocus}
					eagerLoadRichTextEditor={eagerLoadRichTextEditor}
					onChange={onChange}
					onFocus={onFocus}
				/>
			);
	}
}

export default EditableCell;
