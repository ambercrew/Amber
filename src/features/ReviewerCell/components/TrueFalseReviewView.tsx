import React, { useState } from "react";
import Cell from "../../../api/cells/entities/cell";
import TrueFalse from "../../../api/cells/valueObjects/trueFalse";
import styles from "./styles.module.css";

interface Props {
	cell: Cell;
	showAnswer: boolean;
}

function TrueFalseReviewView({ cell, showAnswer }: Props) {
	const trueFalse = JSON.parse(cell.content) as TrueFalse;
	const [chosenAnswer, setChosenAnswer] = useState<boolean | null>(null);

	const handleKeyUp = (e: React.KeyboardEvent) => {
		if (e.key === " ") {
			e.stopPropagation();
		}
	};

	return (
		<>
			<div
				className={`${styles.cardSection} ${styles.questionSection}`}
				dangerouslySetInnerHTML={{ __html: trueFalse.question }}
			/>
			<div className={`${styles.cardSection} ${styles.trueFalseRow}`}>
				<button
					className={`transparent
                        ${chosenAnswer === true && !showAnswer && styles.checked}
                        ${showAnswer && trueFalse.isTrue && styles.correct}`}
					disabled={showAnswer && !trueFalse.isTrue}
					onKeyUp={handleKeyUp}
					onClick={() => setChosenAnswer(true)}>
					True
				</button>
				<button
					className={`transparent
                        ${chosenAnswer === false && !showAnswer && styles.checked}
                        ${showAnswer && !trueFalse.isTrue && styles.correct}`}
					disabled={showAnswer && trueFalse.isTrue}
					onKeyUp={handleKeyUp}
					onClick={() => setChosenAnswer(false)}>
					False
				</button>
			</div>
		</>
	);
}

export default TrueFalseReviewView;
