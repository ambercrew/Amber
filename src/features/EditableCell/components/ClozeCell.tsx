import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import Cell from "../../../api/cells/entities/cell";
import { ClozePlugin } from "../plugins/clozePlugin";
import { LexicalEditor } from "lexical";
import { ClozeNode } from "../plugins/clozeNode";
import { ClozeFloatingMenuButtons } from "../plugins/clozeFloatingMenuButtons";

interface Props {
	cell: Cell;
	autofocus: boolean;
	eagerLoadRichTextEditor: boolean;
	onChange: (content: string) => void;
	onFocus: (editor: LexicalEditor) => void;
}

function ClozeCell({
	cell,
	autofocus,
	eagerLoadRichTextEditor,
	onChange,
	onFocus,
}: Props) {
	return (
		<RichTextEditor
			extraNodes={[ClozeNode]}
			additionalFloatingMenuButtons={ClozeFloatingMenuButtons}
			plugins={[<ClozePlugin key={1} />]}
			content={cell.content}
			autofocus={autofocus}
			eagerLoadRichTextEditor={eagerLoadRichTextEditor}
			onChange={onChange}
			onFocus={onFocus}
		/>
	);
}

export default ClozeCell;
