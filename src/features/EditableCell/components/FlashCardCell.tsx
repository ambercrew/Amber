import { useEffect, useRef, useState } from "react";
import Cell from "../../../types/backend/entity/cell";
import FlashCard from "../../../types/backend/value_objects/flashCard";
import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import styles from "./styles.module.css";
import { Editor } from "@tiptap/react";

interface Props {
	cell: Cell;
	autofocus: boolean;
	eagerLoadRichTextEditor: boolean;
	onUpdate: (content: string) => void;
	onFocus: (editor: Editor) => void;
}

function FlashCardCell({
	cell,
	autofocus,
	eagerLoadRichTextEditor,
	onUpdate,
	onFocus,
}: Props) {
	const flashCard = JSON.parse(cell.content) as FlashCard;
	const question = useRef(flashCard.question);
	const answer = useRef(flashCard.answer);
	const [isAnswerEditorFocused, setIsAnswerEditorFocused] = useState(false);

	useEffect(() => {
		const flashCard = JSON.parse(cell.content) as FlashCard;
		question.current = flashCard.question;
		answer.current = flashCard.answer;
	}, [cell.content]);

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
				content={flashCard.question}
				onUpdate={handleQuestionUpdate}
				autofocus={autofocus && !isAnswerEditorFocused}
				onFocus={e => {
					setIsAnswerEditorFocused(false);
					onFocus(e);
				}}
				eagerLoadRichTextEditor={eagerLoadRichTextEditor}
			/>
			<RichTextEditor
				title="Answer"
				content={flashCard.answer}
				autofocus={autofocus && isAnswerEditorFocused}
				onUpdate={handleAnswerUpdate}
				onFocus={e => {
					setIsAnswerEditorFocused(true);
					onFocus(e);
				}}
				eagerLoadRichTextEditor={eagerLoadRichTextEditor}
			/>
		</div>
	);
}

export default FlashCardCell;
