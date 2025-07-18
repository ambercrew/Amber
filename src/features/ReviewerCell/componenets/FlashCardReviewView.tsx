import Cell from "../../../types/backend/entity/cell";
import FlashCard from "../../../types/cell/flashCard";

interface Props {
	cell: Cell;
	showAnswer: boolean;
}

function FlashCardReviewView({ cell, showAnswer }: Props) {
	const flashCard = JSON.parse(cell.content) as FlashCard;

	return (
		<>
			<div dangerouslySetInnerHTML={{ __html: flashCard.question }} />
			<hr />
			{showAnswer && (
				<div dangerouslySetInnerHTML={{ __html: flashCard.answer }} />
			)}
		</>
	);
}

export default FlashCardReviewView;
