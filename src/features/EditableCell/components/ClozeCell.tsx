import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import {
	mdiDotsHorizontal,
	mdiNumericNegative1,
	mdiNumericPositive1,
} from "@mdi/js";
import Cell from "../../../types/backend/entity/cell";
import {
	ClozePlugin,
	DECREASE_CLOZE_GROUP_NUMBER,
	INCREASE_CLOZE_GROUP_NUMBER,
	TOGGLE_CLOZE_NODE,
} from "../plugins/clozePlugin";
import { LexicalEditor } from "lexical";
import { $isSelectionInsideCloze, ClozeNode } from "../plugins/clozeNode";

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
			additionalFloatingMenuButtons={[
				{
					name: "Toggle Cloze",
					icon: mdiDotsHorizontal,
					title: "Toggle Cloze (Ctrl + Shift + C)",
					onClick: editor =>
						editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined),
					isActive: $isSelectionInsideCloze,
				},
				{
					name: "Cloze+1",
					icon: mdiNumericPositive1,
					title: "Increase cloze group number",
					onClick: editor =>
						editor.dispatchCommand(
							INCREASE_CLOZE_GROUP_NUMBER,
							undefined,
						),
					isActive: () => false,
					isVisible: $isSelectionInsideCloze,
				},
				{
					name: "Cloze-1",
					icon: mdiNumericNegative1,
					title: "Decrease cloze group number",
					onClick: editor =>
						editor.dispatchCommand(
							DECREASE_CLOZE_GROUP_NUMBER,
							undefined,
						),
					isActive: () => false,
					isVisible: $isSelectionInsideCloze,
				},
			]}
			content={cell.content}
			autofocus={autofocus}
			eagerLoadRichTextEditor={eagerLoadRichTextEditor}
			onChange={onChange}
			onFocus={onFocus}
			plugins={[<ClozePlugin key={1} />]}
		/>
	);
}

export default ClozeCell;
