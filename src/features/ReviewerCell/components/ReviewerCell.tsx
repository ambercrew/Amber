import Cell from "../../../api/cells/entities/cell";
import Repetition from "../../../api/cells/entities/repetition";
import ClozeReviewView from "./Cloze";
import FlashCardReviewView from "./FlashCardReviewView";
import TrueFalseReviewView from "./TrueFalseReviewView";

interface Props {
	cell: Cell;
	showAnswer: boolean;
	repetition: Repetition;
}

function ReviewerCell({ cell, showAnswer, repetition }: Props) {
	switch (cell.cellType) {
		case "FlashCard":
			return <FlashCardReviewView cell={cell} showAnswer={showAnswer} />;
		case "Cloze":
			return (
				<ClozeReviewView
					cell={cell}
					showAnswer={showAnswer}
					repetition={repetition}
				/>
			);
		case "TrueFalse":
			return <TrueFalseReviewView cell={cell} showAnswer={showAnswer} />;
		case "Note":
			return null;
		case "IncrementalReading":
			return null;
	}
}

export default ReviewerCell;
