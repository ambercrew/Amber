import Cell from "../../../api/cells/entities/cell";
import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import ClozeCell from "./ClozeCell";
import FlashCardCell from "./FlashCardCell";
import IncrementalReading from "./IncrementalReading/IncrementalReading";
import TrueFalseCell from "./TrueFalseCell";
import { LexicalEditor } from "lexical";

interface Props {
	cell: Cell;
	autofocus: boolean;
	eagerLoadRichTextEditor: boolean;
	onChange: (content: string) => void;
	onFocus: (editor: LexicalEditor) => void;
	saveChanges: () => Promise<void>;
}

function EditableCell({
	cell,
	autofocus,
	eagerLoadRichTextEditor,
	saveChanges,
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
		case "IncrementalReading":
			return (
				<IncrementalReading
					cell={cell}
					autofocus={autofocus}
					onChange={onChange}
					saveChanges={saveChanges}
				/>
			);
	}
}

export default EditableCell;
