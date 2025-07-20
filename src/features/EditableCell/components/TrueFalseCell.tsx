import { Editor } from "@tiptap/react";
import Cell from "../../../types/backend/entity/cell";
import TrueFalse from "../../../types/backend/value_objects/trueFalse";
import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import styles from "./styles.module.css";
import { useState } from "react";

interface Props {
	cell: Cell;
	autofocus: boolean;
	editable: boolean;
	onUpdate: (content: string) => void;
	onFocus: (editor: Editor) => void;
}

export function TrueFalseCell({
	cell,
	autofocus,
	editable,
	onUpdate,
	onFocus,
}: Props) {
	const trueFalse = JSON.parse(cell.content) as TrueFalse;

	const [question, setQuestion] = useState(trueFalse.question);
	const [isTrue, setIsTrue] = useState(trueFalse.isTrue);

	const handleQuestionUpdate = (html: string) => {
		setQuestion(html);
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
				question: question,
				isTrue,
			} as TrueFalse),
		);
	};

	return (
		<div className={styles.trueFalse}>
			<RichTextEditor
				title="Question"
				initialContent={question}
				onUpdate={handleQuestionUpdate}
				autofocus={autofocus}
				onFocus={onFocus}
				editable={editable}
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
