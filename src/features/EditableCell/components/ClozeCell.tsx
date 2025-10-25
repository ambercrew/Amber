import { ChainedCommands, Editor } from "@tiptap/core";
import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import {
	mdiDotsHorizontal,
	mdiNumericNegative1,
	mdiNumericPositive1,
} from "@mdi/js";
import Cell from "../../../types/backend/entity/cell";
import clozeMark from "../utils/clozeMark";
import { clozeMarkName } from "../config/constants";

interface Props {
	cell: Cell;
	autofocus: boolean;
	eagerLoadRichTextEditor: boolean;
	onUpdate: (content: string) => void;
	onFocus: (editor: Editor) => void;
}

const regexp = /<cloze[^>]*index="(\d+)"[^>]*>/g;

function ClozeCell({
	cell,
	autofocus,
	eagerLoadRichTextEditor,
	onUpdate,
	onFocus,
}: Props) {
	const handleToggleCloze = (commands: ChainedCommands) => {
		const matches = cell.content.matchAll(regexp);
		let newClozeIndex = 1;
		for (const match of matches) {
			newClozeIndex = Math.max(newClozeIndex, Number(match[1]));
		}
		return commands.toggleCloze(newClozeIndex);
	};

	return (
		<RichTextEditor
			extraExtensions={[clozeMark]}
			eagerLoadRichTextEditor={eagerLoadRichTextEditor}
			commands={[
				{
					name: clozeMarkName,
					icon: mdiDotsHorizontal,
					title: "Cloze",
					onClick: handleToggleCloze,
				},
				{
					name: "Cloze+1",
					icon: mdiNumericPositive1,
					title: "Increase cloze group number",
					onClick: c => c.increaseClozeIndex(),
				},
				{
					name: "Cloze-1",
					icon: mdiNumericNegative1,
					title: "Decrease cloze group number",
					onClick: c => c.decreaseClozeIndex(),
				},
			]}
			content={cell.content}
			autofocus={autofocus}
			onUpdate={onUpdate}
			onFocus={onFocus}
		/>
	);
}

export default ClozeCell;
