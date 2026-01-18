import { useEffect, useRef, useState } from "react";
import Cell from "../../../types/backend/entity/cell";
import FlashCard from "../../../types/backend/valueObjects/flashCard";
import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import styles from "./styles.module.css";
import { LexicalEditor } from "lexical";

interface Props {
	cell: Cell;
	autofocus: boolean;
	eagerLoadRichTextEditor: boolean;
	onChange: (content: string) => void;
	onFocus: (editor: LexicalEditor) => void;
}

function FlashCardCell({
	cell,
	autofocus,
	eagerLoadRichTextEditor,
	onChange,
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

	const handleQuestionChange = (html: string) => {
		question.current = html;
		onChange(
			JSON.stringify({
				question: html,
				answer: answer.current,
			} as FlashCard),
		);
	};

	const handleAnswerChange = (html: string) => {
		answer.current = html;
		onChange(
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
				onChange={handleQuestionChange}
				autofocus={autofocus && !isAnswerEditorFocused}
				eagerLoadRichTextEditor={eagerLoadRichTextEditor}
				onFocus={e => {
					setIsAnswerEditorFocused(false);
					onFocus(e);
				}}
			/>
			<RichTextEditor
				title="Answer"
				content={flashCard.answer}
				autofocus={autofocus && isAnswerEditorFocused}
				eagerLoadRichTextEditor={eagerLoadRichTextEditor}
				onChange={handleAnswerChange}
				onFocus={e => {
					setIsAnswerEditorFocused(true);
					onFocus(e);
				}}
			/>
		</div>
	);
}

export default FlashCardCell;
