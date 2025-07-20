import { useRef } from "react";
import Cell from "../../../types/backend/entity/cell";
import FlashCard from "../../../types/backend/value_objects/flashCard";
import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import styles from "./styles.module.css";
import { Editor } from "@tiptap/react";

interface Props {
	cell: Cell;
	autofocus: boolean;
	editable: boolean;
	onUpdate: (content: string) => void;
	onFocus: (editor: Editor) => void;
}

function FlashCardCell({
	cell,
	autofocus,
	editable,
	onUpdate,
	onFocus,
}: Props) {
	const flashCard = JSON.parse(cell.content) as FlashCard;

	const question = useRef(flashCard.question);
	const answer = useRef(flashCard.answer);
	const isAnswerEditorFocused = useRef(false);

	const handleQuestionUpdate = (html: string) => {
		question.current = html;
		onUpdate(
			JSON.stringify({
				question: html,
				answer: answer.current,
			} as FlashCard),
		);
	};

	const handleAnswerUpdate = (html: string) => {
		answer.current = html;
		onUpdate(
			JSON.stringify({
				question: question.current,
				answer: html,
			} as FlashCard),
		);
	};

	return (
		<div className={styles.flashCard}>
			<RichTextEditor
				title="Question"
				initialContent={question.current}
				onUpdate={handleQuestionUpdate}
				autofocus={autofocus && !isAnswerEditorFocused.current}
				onFocus={onFocus}
				editable={editable}
			/>
			<RichTextEditor
				title="Answer"
				initialContent={answer.current}
				autofocus={false}
				onUpdate={handleAnswerUpdate}
				onFocus={e => {
					isAnswerEditorFocused.current = true;
					onFocus(e);
				}}
				onBlur={() => (isAnswerEditorFocused.current = false)}
				editable={editable}
			/>
		</div>
	);
}

export default FlashCardCell;
