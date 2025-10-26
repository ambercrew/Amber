import { Editor } from "@tiptap/react";
import Cell from "../../../types/backend/entity/cell";
import TrueFalse from "../../../types/backend/value_objects/trueFalse";
import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import styles from "./styles.module.css";
import { useRef, useState } from "react";

interface Props {
	cell: Cell;
	autofocus: boolean;
	eagerLoadRichTextEditor: boolean;
	onUpdate: (content: string) => void;
	onFocus: (editor: Editor) => void;
}

export function TrueFalseCell({
	cell,
	autofocus,
	eagerLoadRichTextEditor,
	onUpdate,
	onFocus,
}: Props) {
	const trueFalse = JSON.parse(cell.content) as TrueFalse;
	const question = useRef(trueFalse.question);
	const [isTrue, setIsTrue] = useState(trueFalse.isTrue);

	const handleQuestionUpdate = (html: string) => {
		question.current = html;
		onUpdate(
			JSON.stringify({
				question: html,
				isTrue: isTrue,
			} as TrueFalse),
		);
	};

	const handleTrueFalseUpdate = (isTrue: boolean) => {
		setIsTrue(isTrue);
		onUpdate(
			JSON.stringify({
				question: question.current,
				isTrue,
			} as TrueFalse),
		);
	};

	return (
		<div className={styles.trueFalse}>
			<RichTextEditor
				title="Question"
				content={trueFalse.question}
				onUpdate={handleQuestionUpdate}
				autofocus={autofocus}
				onFocus={onFocus}
				eagerLoadRichTextEditor={eagerLoadRichTextEditor}
			/>
			<div className={styles.buttonsRow}>
				<button
					className={`transparent ${isTrue && styles.checked}`}
					onClick={e => {
						e.stopPropagation();
						handleTrueFalseUpdate(true);
					}}>
					True
				</button>
				<button
					className={`transparent ${!isTrue && styles.checked}`}
					onClick={e => {
						e.stopPropagation();
						handleTrueFalseUpdate(false);
					}}>
					False
				</button>
			</div>
		</div>
	);
}

export default TrueFalseCell;
