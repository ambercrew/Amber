import Cell from "../../../api/cells/entities/cell";
import FlashCard from "../../../api/cells/valueObjects/flashCard";
import styles from "./styles.module.css";

interface Props {
	cell: Cell;
	showAnswer: boolean;
}

function FlashCardReviewView({ cell, showAnswer }: Props) {
	const flashCard = JSON.parse(cell.content) as FlashCard;

	return (
		<>
			<div
				className={`${styles.cardSection} ${styles.questionSection}`}
				dangerouslySetInnerHTML={{ __html: flashCard.question }}
			/>
			{showAnswer && (
				<div
					className={styles.cardSection}
					dangerouslySetInnerHTML={{ __html: flashCard.answer }}
				/>
			)}
		</>
	);
}

export default FlashCardReviewView;
