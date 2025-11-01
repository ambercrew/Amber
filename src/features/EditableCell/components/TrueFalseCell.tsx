import Cell from "../../../types/backend/entity/cell";
import TrueFalse from "../../../types/backend/value_objects/trueFalse";
import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import styles from "./styles.module.css";
import { useRef, useState } from "react";
import { LexicalEditor } from "lexical";

interface Props {
	cell: Cell;
	autofocus: boolean;
	onChange: (content: string) => void;
	onFocus: (editor: LexicalEditor) => void;
}

export function TrueFalseCell({ cell, autofocus, onChange, onFocus }: Props) {
	const trueFalse = JSON.parse(cell.content) as TrueFalse;
	const question = useRef(trueFalse.question);
	const [isTrue, setIsTrue] = useState(trueFalse.isTrue);

	const handleQuestionChange = (html: string) => {
		question.current = html;
		onChange(
			JSON.stringify({
				question: html,
				isTrue: isTrue,
			} as TrueFalse),
		);
	};

	const handleTrueFalseChange = (isTrue: boolean) => {
		setIsTrue(isTrue);
		onChange(
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
				onChange={handleQuestionChange}
				autofocus={autofocus}
				onFocus={onFocus}
			/>
			<div className={styles.buttonsRow}>
				<button
					className={`transparent ${isTrue && styles.checked}`}
					onClick={e => {
						e.stopPropagation();
						handleTrueFalseChange(true);
					}}>
					True
				</button>
				<button
					className={`transparent ${!isTrue && styles.checked}`}
					onClick={e => {
						e.stopPropagation();
						handleTrueFalseChange(false);
					}}>
					False
				</button>
			</div>
		</div>
	);
}

export default TrueFalseCell;
